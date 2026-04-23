import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const defaultScriptPath = path.join(projectRoot, "src", "data", "script.json");
const defaultReportPath = path.join(projectRoot, "review-report.generated.json");
const defaultFeedbackPath = path.join(
	projectRoot,
	"review-feedback.generated.json",
);

const OUTPUT_PRESETS = {
	"landscape-fhd": {width: 1920, height: 1080, fps: 30},
	"portrait-fhd": {width: 1080, height: 1920, fps: 30},
};

const FLASHY_TRANSITIONS = new Set(["glitch", "flash", "lightLeak", "whip", "spin"]);

const severityRank = {
	info: 0,
	low: 1,
	medium: 2,
	high: 3,
	critical: 4,
};

const parseArgs = (argv) => {
	const parsed = {
		script: defaultScriptPath,
		variant: "",
		output: defaultReportPath,
		feedbackOutput: defaultFeedbackPath,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--script") {
			parsed.script = path.resolve(projectRoot, argv[index + 1] ?? "");
			index += 1;
			continue;
		}
		if (arg === "--variant") {
			parsed.variant = argv[index + 1] ?? "";
			index += 1;
			continue;
		}
		if (arg === "--output") {
			parsed.output = path.resolve(projectRoot, argv[index + 1] ?? "");
			index += 1;
			continue;
		}
		if (arg === "--feedback-output") {
			parsed.feedbackOutput = path.resolve(projectRoot, argv[index + 1] ?? "");
			index += 1;
		}
	}

	return parsed;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const exists = (filePath) => {
	try {
		return fs.existsSync(filePath);
	} catch {
		return false;
	}
};

const toPositiveInt = (value, fallback) => {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.round(value);
	}
	return fallback;
};

const toNonNegativeInt = (value, fallback) => {
	if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
		return Math.round(value);
	}
	return fallback;
};

const stripWhitespace = (value) => String(value ?? "").replace(/\s+/g, "");

const countCharacters = (value) => Array.from(stripWhitespace(value)).length;

const measureUnits = (value) =>
	Array.from(String(value ?? "")).reduce((total, char) => {
		if (/\s/.test(char)) {
			return total + 0.3;
		}
		if (/[A-Za-z0-9]/.test(char)) {
			return total + 0.58;
		}
		return total + 1;
	}, 0);

const getSubtitleLayoutDefaults = ({width, height}) => {
	const portrait = height > width;
	if (portrait) {
		return {
			widthPct: 88,
			heightPct: 16,
			bottomPct: 6,
			fontSize: 88,
		};
	}
	return {
		widthPct: 66,
		heightPct: 14,
		bottomPct: 4,
		fontSize: 78,
	};
};

const getSubtitleLineUnitLimit = ({width, height, widthPct, fontSize, horizontalPaddingPx}) => {
	const portrait = height > width;
	const availableWidthPx =
		width * (widthPct / 100) - (horizontalPaddingPx ?? 0);
	const unitPixelRatio = portrait ? 0.94 : 0.68;
	const workingFontSize = fontSize * (portrait ? 1 : 0.9);
	const baseLimit = Math.floor(
		availableWidthPx / Math.max(1, workingFontSize * unitPixelRatio),
	);
	return Math.max(6, Math.min(portrait ? 13 : 20, baseLimit));
};

const estimateSubtitleMetrics = ({text, width, height, subtitleWidth, fontSize}) => {
	const defaults = getSubtitleLayoutDefaults({width, height});
	const widthPct = subtitleWidth ?? defaults.widthPct;
	const resolvedFontSize = fontSize ?? defaults.fontSize;
	const lineUnitLimit = getSubtitleLineUnitLimit({
		width,
		height,
		widthPct,
		fontSize: resolvedFontSize,
		horizontalPaddingPx: 16,
	});
	const totalUnits = measureUnits(text);
	const estimatedLineCount = Math.max(1, Math.ceil(totalUnits / Math.max(1, lineUnitLimit)));
	const estimatedPages = Math.max(1, Math.ceil(estimatedLineCount / 2));
	return {
		lineUnitLimit,
		totalUnits: Math.round(totalUnits * 100) / 100,
		estimatedLineCount,
		estimatedPages,
	};
};

const toTimecode = (frame, fps) => {
	const wholeFrame = Math.max(0, Math.floor(frame));
	const totalSeconds = wholeFrame / fps;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	const centiseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 100);
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
};

const resolveVariant = (script, forcedVariant) => {
	if (forcedVariant === "long" || forcedVariant === "short") {
		return forcedVariant;
	}
	if (script.activeVariant === "long" || script.activeVariant === "short") {
		return script.activeVariant;
	}
	if (script.renderVariant === "long" || script.renderVariant === "short") {
		return script.renderVariant;
	}
	if (script.project?.defaultVariant === "long" || script.project?.defaultVariant === "short") {
		return script.project.defaultVariant;
	}
	return script.short ? "short" : "long";
};

const resolveTemplateId = (script) => script.template?.id ?? "yukkuri-explainer";

const resolveOutput = (script, variant) => {
	const presetId =
		script.output?.preset ??
		(variant === "short" ? "portrait-fhd" : "landscape-fhd");
	const preset = OUTPUT_PRESETS[presetId] ?? OUTPUT_PRESETS["landscape-fhd"];
	const variantConfig = script?.[variant]?.config ?? {};
	const width = toPositiveInt(script.output?.width ?? variantConfig.width, preset.width);
	const height = toPositiveInt(script.output?.height ?? variantConfig.height, preset.height);
	const fps = toPositiveInt(script.output?.fps ?? variantConfig.fps, preset.fps);
	return {
		width,
		height,
		fps,
		orientation: height > width ? "portrait" : "landscape",
	};
};

const resolveSceneArray = (script, variant) => {
	if (Array.isArray(script.timeline?.scenes)) {
		return script.timeline.scenes;
	}
	if (Array.isArray(script?.[variant]?.scenes)) {
		return script[variant].scenes;
	}
	if (Array.isArray(script.scenes)) {
		return script.scenes;
	}
	return [];
};

const resolveBgmSequence = (script, variant) => {
	if (Array.isArray(script.timeline?.bgm)) {
		return script.timeline.bgm.map((entry) => ({
			at_scene: toNonNegativeInt(entry.atScene, 0),
			file: String(entry.file ?? ""),
		}));
	}
	if (Array.isArray(script?.[variant]?.bgm_sequence)) {
		return script[variant].bgm_sequence.map((entry) => ({
			at_scene: toNonNegativeInt(entry.at_scene, 0),
			file: String(entry.file ?? ""),
		}));
	}
	if (typeof script?.[variant]?.bgm === "string" && script[variant].bgm) {
		return [{at_scene: 0, file: script[variant].bgm}];
	}
	return [];
};

const normalizeClipScenes = (script, variant) => {
	const scenes = resolveSceneArray(script, variant);
	let cursor = 0;
	const items = scenes.map((scene, index) => {
		const duration = toPositiveInt(scene.duration, 90);
		const startFrame = toNonNegativeInt(scene.startTime, cursor);
		const endFrame = startFrame + duration;
		cursor = endFrame;
		return {
			id: scene.id ?? `scene_${index + 1}`,
			index,
			startFrame,
			endFrame,
			duration,
			text: String(scene.speechText ?? scene.text ?? scene.subtitleText ?? ""),
			speaker: String(scene.speaker ?? ""),
			voiceFile: typeof scene.voiceFile === "string" ? scene.voiceFile : undefined,
			bg_image: typeof scene.bg_image === "string" ? scene.bg_image : undefined,
			bg_video: typeof scene.bg_video === "string" ? scene.bg_video : undefined,
			subtitleWidth: typeof scene.subtitleWidth === "number" ? scene.subtitleWidth : undefined,
			subtitleStyle: scene.subtitleStyle ?? {},
			popups: Array.isArray(scene.popups) ? scene.popups : [],
			transition: scene.transition ?? null,
		};
	});
	return {
		items,
		totalFrames: items.reduce((max, item) => Math.max(max, item.endFrame), 0),
		bgmSequence: resolveBgmSequence(script, variant),
	};
};

const normalizeGameplaySegments = (script) => {
	const gameplay = script.timeline?.gameplay ?? {};
	const segments = Array.isArray(gameplay.segments) ? gameplay.segments : [];
	let cursor = 0;
	const items = segments.map((segment, index) => {
		const duration = toPositiveInt(segment.duration, 90);
		const startFrame = toNonNegativeInt(segment.startTime, cursor);
		const endFrame = startFrame + duration;
		cursor = endFrame;
		return {
			id: segment.id ?? `segment_${index + 1}`,
			index,
			startFrame,
			endFrame,
			duration,
			text: String(segment.speechText ?? segment.text ?? ""),
			speaker: String(segment.speaker ?? ""),
			voiceFile: typeof segment.voiceFile === "string" ? segment.voiceFile : undefined,
			popups: Array.isArray(segment.popups) ? segment.popups : [],
			video: typeof segment.video === "string" ? segment.video : gameplay.video,
			trimBefore: segment.trimBefore,
			sourceDuration: segment.sourceDuration,
		};
	});
	return {
		items,
		totalFrames: items.reduce((max, item) => Math.max(max, item.endFrame), 0),
		bgmSequence: resolveBgmSequence(script, "long"),
	};
};

const normalizeLineChat = (script) => {
	const chat = script.timeline?.chat ?? {};
	const messages = Array.isArray(chat.messages) ? chat.messages : [];
	let cursor = 0;
	const items = messages.map((message, index) => {
		const typingFrames = toNonNegativeInt(message.typingFrames, 0);
		const duration = Math.max(45, toPositiveInt(message.duration, 90));
		const startFrame = toNonNegativeInt(message.revealFrame, cursor + typingFrames);
		const endFrame = startFrame + duration;
		cursor = endFrame;
		return {
			id: message.id ?? `msg_${index + 1}`,
			index,
			startFrame,
			endFrame,
			duration,
			text: String(message.speechText ?? message.text ?? message.sticker ?? ""),
			sender: String(message.sender ?? ""),
			voiceFile: typeof message.voiceFile === "string" ? message.voiceFile : undefined,
		};
	});
	return {
		items,
		totalFrames: items.reduce((max, item) => Math.max(max, item.endFrame), 0) + 30,
		bgmSequence: resolveBgmSequence(script, "short"),
	};
};

const resolveAssetCandidates = (asset, bucket) => {
	if (!asset) {
		return [];
	}
	const clean = String(asset).replace(/^\/+/, "");
	const publicDir = path.join(projectRoot, "public");
	const candidates = [path.join(publicDir, clean)];

	if (bucket === "voice") {
		candidates.push(path.join(publicDir, "voices", clean));
	}
	if (bucket === "bgm") {
		candidates.push(path.join(publicDir, "assets", "bgm", clean));
	}
	if (bucket === "se") {
		candidates.push(path.join(publicDir, "assets", "se", clean));
	}
	if (bucket === "image") {
		candidates.push(path.join(publicDir, "assets", "images", clean));
		candidates.push(path.join(publicDir, "assets", "imported", clean));
	}
	if (bucket === "bg-image") {
		candidates.push(path.join(publicDir, "assets", "images", clean));
		candidates.push(path.join(publicDir, "assets", "stock", clean));
	}
	if (bucket === "bg-video" || bucket === "gameplay-video") {
		candidates.push(path.join(publicDir, "assets", "video", clean));
		candidates.push(path.join(publicDir, "assets", "stock", clean));
	}

	return [...new Set(candidates)];
};

const resolveAssetMissing = (asset, bucket) => {
	if (!asset) {
		return false;
	}
	const candidates = resolveAssetCandidates(asset, bucket);
	return !candidates.some((candidate) => exists(candidate));
};

const createIssueFactory = ({fps, issues}) => {
	return (payload) => {
		const startFrame = Math.max(0, Math.floor(payload.startFrame));
		const endFrame = Math.max(startFrame, Math.floor(payload.endFrame));
		const issue = {
			id: `issue_${String(issues.length + 1).padStart(3, "0")}`,
			category: payload.category,
			type: payload.type,
			severity: payload.severity,
			title: payload.title,
			description: payload.description,
			sceneId: payload.sceneId,
			sceneIndex: payload.sceneIndex,
			targetLayer: payload.targetLayer,
			suggestedActions: payload.suggestedActions,
			timeRange: {
				startFrame,
				endFrame,
				startTimecode: toTimecode(startFrame, fps),
				endTimecode: toTimecode(endFrame, fps),
			},
			metrics: payload.metrics ?? {},
			blocking: Boolean(payload.blocking),
		};
		issues.push(issue);
	};
};

const getDefaultSeverityCounts = () => ({
	info: 0,
	low: 0,
	medium: 0,
	high: 0,
	critical: 0,
});

const getDefaultCategoryCounts = () => ({
	subtitle: 0,
	timing: 0,
	audio: 0,
	visual: 0,
	asset: 0,
	rights: 0,
	structure: 0,
});

const analyzeClipScenes = ({items, output, fps, variant, pushIssue}) => {
	const fastCpsWarn = variant === "short" ? 7.2 : 8.5;
	const fastCpsHigh = variant === "short" ? 9.2 : 11.5;
	const slowCpsWarn = variant === "short" ? 1.8 : 2.1;

	for (const item of items) {
		const charCount = countCharacters(item.text);
		const durationSeconds = item.duration / fps;
		const cps = durationSeconds > 0 ? charCount / durationSeconds : 0;
		const subtitleMetrics = estimateSubtitleMetrics({
			text: item.text,
			width: output.width,
			height: output.height,
			subtitleWidth: item.subtitleWidth,
			fontSize: item.subtitleStyle?.fontSize,
		});

		if (item.duration < (variant === "short" ? 60 : 75)) {
			pushIssue({
				category: "timing",
				type: "scene-too-short",
				severity: charCount > 24 ? "medium" : "low",
				title: "Scene may be too short",
				description:
					"このシーンは短めです。字幕・図版・ナレーションの確認時間が足りない可能性があります。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "timing",
				suggestedActions: ["extend-scene", "split-scene"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {
					durationFrames: item.duration,
					durationSeconds: Math.round(durationSeconds * 100) / 100,
				},
			});
		}

		if (item.duration > (variant === "short" ? 210 : 420)) {
			pushIssue({
				category: "timing",
				type: "scene-too-long",
				severity: item.duration > (variant === "short" ? 300 : 540) ? "medium" : "low",
				title: "Scene may be too long",
				description:
					"このシーンは長めです。テンポが落ちるか、情報の分割余地があるかを確認してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "timing",
				suggestedActions: ["split-scene", "shorten-text"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {
					durationFrames: item.duration,
					durationSeconds: Math.round(durationSeconds * 100) / 100,
				},
			});
		}

		if (charCount > 0 && cps > fastCpsWarn) {
			pushIssue({
				category: "timing",
				type: "text-pacing-fast",
				severity: cps > fastCpsHigh ? "high" : "medium",
				title: "Narration pacing may be too fast",
				description:
					"文字量に対して表示尺が短めです。読み切れない、または音声が詰まる可能性があります。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "script",
				suggestedActions: ["shorten-text", "split-scene", "extend-scene"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {
					charCount,
					charsPerSecond: Math.round(cps * 100) / 100,
				},
			});
		}

		if (charCount > 0 && durationSeconds >= 6 && cps < slowCpsWarn) {
			pushIssue({
				category: "timing",
				type: "text-pacing-slow",
				severity: "low",
				title: "Narration pacing may be too slow",
				description:
					"このシーンは文字量に比べて長めです。間を活かしたい場面か、尺を短くできるか確認してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "script",
				suggestedActions: ["merge-scene", "extend-popup", "keep-as-is"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {
					charCount,
					charsPerSecond: Math.round(cps * 100) / 100,
				},
			});
		}

		if (subtitleMetrics.estimatedPages > 1) {
			pushIssue({
				category: "subtitle",
				type: "subtitle-multi-page",
				severity: variant === "short" && subtitleMetrics.estimatedPages > 2 ? "medium" : "info",
				title: "Subtitle is likely to paginate",
				description:
					"字幕が 2 行に収まりきらず、ページ送りになる見込みです。切り替え位置が自然か確認してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "subtitle",
				suggestedActions: ["rewrite-text", "adjust-subtitle-box", "keep-as-is"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: subtitleMetrics,
			});
		}

		if (subtitleMetrics.totalUnits > subtitleMetrics.lineUnitLimit * 2.6) {
			pushIssue({
				category: "subtitle",
				type: "subtitle-layout-risk",
				severity: variant === "short" ? "medium" : "low",
				title: "Subtitle layout may feel cramped",
				description:
					"字幕の幅や文字量の関係で、折り返しや見切れの微調整が必要になる可能性があります。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "subtitle",
				suggestedActions: ["adjust-subtitle-box", "rewrite-text", "reduce-font-size"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: subtitleMetrics,
			});
		}

		if (!item.voiceFile && charCount > 0) {
			pushIssue({
				category: "audio",
				type: "missing-voice-file",
				severity: "low",
				title: "Voice file is not assigned",
				description:
					"セリフはありますが、voiceFile が未設定です。読み上げ前の確認か、生成漏れかを見てください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "audio",
				suggestedActions: ["generate-voice", "manual-review"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {charCount},
			});
		}

		if (item.voiceFile && resolveAssetMissing(item.voiceFile, "voice")) {
			pushIssue({
				category: "asset",
				type: "missing-asset-file",
				severity: "high",
				title: "Voice asset file is missing",
				description:
					"voiceFile は設定されていますが、対応するファイルが見つかりません。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "assets",
				suggestedActions: ["generate-voice", "replace-asset"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {voiceFile: item.voiceFile},
				blocking: true,
			});
		}

		if (!item.bg_image && !item.bg_video) {
			pushIssue({
				category: "visual",
				type: "missing-background",
				severity: "low",
				title: "Background is not assigned",
				description:
					"背景画像または背景動画が未設定です。意図的な単色背景でないなら補う候補です。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "visual",
				suggestedActions: ["replace-asset", "keep-as-is"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
			});
		}

		if (item.bg_image && resolveAssetMissing(item.bg_image, "bg-image")) {
			pushIssue({
				category: "asset",
				type: "missing-asset-file",
				severity: "high",
				title: "Background image file is missing",
				description: "bg_image に対応するファイルが見つかりません。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "assets",
				suggestedActions: ["replace-asset", "verify-asset"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {asset: item.bg_image},
				blocking: true,
			});
		}

		if (item.bg_video && resolveAssetMissing(item.bg_video, "bg-video")) {
			pushIssue({
				category: "asset",
				type: "missing-asset-file",
				severity: "high",
				title: "Background video file is missing",
				description: "bg_video に対応するファイルが見つかりません。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "assets",
				suggestedActions: ["replace-asset", "verify-asset"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {asset: item.bg_video},
				blocking: true,
			});
		}

		if (item.transition?.type && FLASHY_TRANSITIONS.has(item.transition.type)) {
			pushIssue({
				category: "visual",
				type: "transition-flash-risk",
				severity: item.transition.type === "flash" || item.transition.type === "glitch" ? "medium" : "low",
				title: "Transition may feel too aggressive",
				description:
					"刺激の強いトランジションが使われています。チカつきや過剰演出になっていないか確認してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "transition",
				suggestedActions: ["change-transition", "keep-as-is"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {transitionType: item.transition.type},
			});
		}

		for (const [popupIndex, popup] of item.popups.entries()) {
			const popupStart = item.startFrame + toNonNegativeInt(popup.startOffset, 0);
			const popupDuration = toPositiveInt(popup.duration, 90);
			const popupEnd = popupStart + popupDuration;
			const popupHasComponent = typeof popup.component === "string" && popup.component.length > 0;
			const popupHasImage = typeof popup.image === "string" && popup.image.length > 0;
			const minimumDuration = popupHasComponent
				? (variant === "short" ? 72 : 96)
				: (variant === "short" ? 42 : 60);

			if (popupDuration < minimumDuration) {
				pushIssue({
					category: "visual",
					type: "popup-duration-short",
					severity: popupHasComponent ? "medium" : "low",
					title: "Popup duration may be too short",
					description:
						"画像や図版の表示尺が短めです。読み取りや理解に必要な時間が足りるかを確認してください。",
					sceneId: item.id,
					sceneIndex: item.index,
					targetLayer: "timing",
					suggestedActions: ["extend-popup", "extend-scene"],
					startFrame: popupStart,
					endFrame: popupEnd - 1,
					metrics: {
						popupIndex,
						durationFrames: popupDuration,
					},
				});
			}

			if (popupHasComponent && popupEnd < item.endFrame - 15) {
				pushIssue({
					category: "visual",
					type: "component-hold-risk",
					severity: "low",
					title: "Infographic component may disappear early",
					description:
						"Remotion 図版がシーンの説明が終わる前に消える可能性があります。次の図版が出るまで保持するか確認してください。",
					sceneId: item.id,
					sceneIndex: item.index,
					targetLayer: "visual",
					suggestedActions: ["hold-component-longer", "extend-popup"],
					startFrame: popupStart,
					endFrame: popupEnd - 1,
					metrics: {
						popupIndex,
						sceneEndFrame: item.endFrame,
					},
				});
			}

			if (popupHasImage && resolveAssetMissing(popup.image, "image")) {
				pushIssue({
					category: "asset",
					type: "missing-asset-file",
					severity: "high",
					title: "Popup image file is missing",
					description: "popup.image に対応するファイルが見つかりません。",
					sceneId: item.id,
					sceneIndex: item.index,
					targetLayer: "assets",
					suggestedActions: ["replace-asset", "verify-asset"],
					startFrame: popupStart,
					endFrame: popupEnd - 1,
					metrics: {
						popupIndex,
						asset: popup.image,
					},
					blocking: true,
				});
			}

			if (popup.transition?.type && FLASHY_TRANSITIONS.has(popup.transition.type)) {
				pushIssue({
					category: "visual",
					type: "transition-flash-risk",
					severity: popup.transition.type === "flash" || popup.transition.type === "glitch" ? "medium" : "low",
					title: "Popup transition may feel too aggressive",
					description:
						"popup に刺激の強いトランジションが設定されています。視認性やチカつきを確認してください。",
					sceneId: item.id,
					sceneIndex: item.index,
					targetLayer: "transition",
					suggestedActions: ["change-transition", "keep-as-is"],
					startFrame: popupStart,
					endFrame: popupEnd - 1,
					metrics: {
						popupIndex,
						transitionType: popup.transition.type,
					},
				});
			}
		}
	}
};

const analyzeGameplay = ({items, fps, pushIssue}) => {
	for (const item of items) {
		const charCount = countCharacters(item.text);
		const durationSeconds = item.duration / fps;
		const cps = durationSeconds > 0 ? charCount / durationSeconds : 0;

		if (!item.video || resolveAssetMissing(item.video, "gameplay-video")) {
			pushIssue({
				category: "asset",
				type: "missing-asset-file",
				severity: "high",
				title: "Gameplay source video is missing",
				description:
					"segment または gameplay timeline の動画ファイルが見つかりません。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "assets",
				suggestedActions: ["replace-asset", "verify-asset"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {video: item.video ?? ""},
				blocking: true,
			});
		}

		if (item.trimBefore === undefined && item.sourceDuration === undefined) {
			pushIssue({
				category: "structure",
				type: "gameplay-trim-missing",
				severity: "medium",
				title: "Gameplay trim info is incomplete",
				description:
					"trimBefore または sourceDuration が未設定です。切り抜きの位置と長さを再確認してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "timing",
				suggestedActions: ["adjust-gameplay-trim", "manual-review"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
			});
		}

		if (charCount > 0 && cps > 8.8) {
			pushIssue({
				category: "timing",
				type: "text-pacing-fast",
				severity: cps > 11 ? "high" : "medium",
				title: "Gameplay commentary may be too dense",
				description:
					"実況テキスト量に対して尺が短めです。プレイ映像も追う必要があるため、通常の解説より厳しめに見ています。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "script",
				suggestedActions: ["shorten-text", "extend-scene"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {
					charCount,
					charsPerSecond: Math.round(cps * 100) / 100,
				},
			});
		}

		if (!item.voiceFile && charCount > 0) {
			pushIssue({
				category: "audio",
				type: "missing-voice-file",
				severity: "low",
				title: "Gameplay segment has no voice file",
				description:
					"実況セリフがありますが voiceFile がありません。生成前か、割り当て漏れかを確認してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "audio",
				suggestedActions: ["generate-voice", "manual-review"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
			});
		}
	}
};

const analyzeLineChat = ({items, output, fps, pushIssue}) => {
	for (const item of items) {
		const charCount = countCharacters(item.text);
		const durationSeconds = item.duration / fps;
		const cps = durationSeconds > 0 ? charCount / durationSeconds : 0;
		const subtitleMetrics = estimateSubtitleMetrics({
			text: item.text,
			width: output.width,
			height: output.height,
			subtitleWidth: 88,
			fontSize: 88,
		});

		if (charCount > 0 && cps > 6.8) {
			pushIssue({
				category: "timing",
				type: "chat-message-dense",
				severity: cps > 8.2 ? "high" : "medium",
				title: "Chat message may reveal too quickly",
				description:
					"LINE 形式では一読で理解できる速さが重要です。表示尺か文章量を見直してください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "timing",
				suggestedActions: ["adjust-chat-timing", "rewrite-text"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: {
					charCount,
					charsPerSecond: Math.round(cps * 100) / 100,
				},
			});
		}

		if (subtitleMetrics.estimatedPages > 1) {
			pushIssue({
				category: "subtitle",
				type: "subtitle-layout-risk",
				severity: "medium",
				title: "Chat text may overflow a natural glance",
				description:
					"メッセージが長めで、ひと目で読みづらくなる可能性があります。会話文として短く保つか、表示尺を伸ばしてください。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "script",
				suggestedActions: ["rewrite-text", "adjust-chat-timing"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				metrics: subtitleMetrics,
			});
		}

		if (item.voiceFile && resolveAssetMissing(item.voiceFile, "voice")) {
			pushIssue({
				category: "asset",
				type: "missing-asset-file",
				severity: "high",
				title: "Chat voice file is missing",
				description:
					"voiceFile は設定されていますが、対応するファイルがありません。",
				sceneId: item.id,
				sceneIndex: item.index,
				targetLayer: "assets",
				suggestedActions: ["generate-voice", "replace-asset"],
				startFrame: item.startFrame,
				endFrame: item.endFrame - 1,
				blocking: true,
			});
		}
	}
};

const analyzeBgm = ({templateId, bgmSequence, items, pushIssue}) => {
	if (templateId === "line-chat") {
		return;
	}

	if (!bgmSequence.length && items.length > 1) {
		pushIssue({
			category: "audio",
			type: "bgm-missing",
			severity: "info",
			title: "No BGM sequence is assigned",
			description:
				"BGM が未設定です。意図的な無音運用でなければ、hook や summary だけでも入れるか確認してください。",
			targetLayer: "audio",
			suggestedActions: ["change-bgm", "add-silence", "keep-as-is"],
			startFrame: 0,
			endFrame: items.length > 0 ? items[items.length - 1].endFrame - 1 : 0,
		});
		return;
	}

	for (let index = 0; index < bgmSequence.length; index += 1) {
		const entry = bgmSequence[index];
		const currentItem = items[entry.at_scene];
		const nextEntry = bgmSequence[index + 1];
		if (entry.file && resolveAssetMissing(entry.file, "bgm")) {
			pushIssue({
				category: "asset",
				type: "missing-asset-file",
				severity: "high",
				title: "BGM file is missing",
				description: "bgm_sequence に設定されたファイルが見つかりません。",
				sceneId: currentItem?.id,
				sceneIndex: currentItem?.index,
				targetLayer: "assets",
				suggestedActions: ["replace-asset", "verify-asset"],
				startFrame: currentItem?.startFrame ?? 0,
				endFrame: currentItem?.endFrame ? currentItem.endFrame - 1 : 0,
				metrics: {bgmFile: entry.file},
				blocking: true,
			});
		}

		if (nextEntry && nextEntry.at_scene - entry.at_scene < 1) {
			pushIssue({
				category: "audio",
				type: "bgm-change-dense",
				severity: "medium",
				title: "BGM changes too quickly",
				description:
					"BGM の切り替え間隔が短すぎる可能性があります。意図した展開か、過密かを確認してください。",
				sceneId: currentItem?.id,
				sceneIndex: currentItem?.index,
				targetLayer: "audio",
				suggestedActions: ["change-bgm", "keep-as-is"],
				startFrame: currentItem?.startFrame ?? 0,
				endFrame: items[nextEntry.at_scene]?.endFrame
					? items[nextEntry.at_scene].endFrame - 1
					: currentItem?.endFrame ?? 0,
				metrics: {
					fromScene: entry.at_scene,
					toScene: nextEntry.at_scene,
				},
			});
		}
	}
};

const buildFeedbackTemplate = ({reportPath, variant, templateId, issues}) => {
	return {
		version: 1,
		createdAt: new Date().toISOString(),
		reportPath,
		variant,
		templateId,
		items: issues
			.filter((issue) => severityRank[issue.severity] >= severityRank.low)
			.map((issue) => ({
				id: `feedback_${issue.id}`,
				issueId: issue.id,
				status: "open",
				priority:
					severityRank[issue.severity] >= severityRank.high
						? "high"
						: severityRank[issue.severity] >= severityRank.medium
							? "medium"
							: "low",
				sceneId: issue.sceneId,
				targetLayer: issue.targetLayer,
				action: issue.suggestedActions[0],
				timeRange: issue.timeRange,
				comment: "ここをどう直したいかを書いてください。",
				desiredOutcome: issue.title,
				patch: {},
			})),
	};
};

const main = () => {
	const args = parseArgs(process.argv.slice(2));
	const script = readJson(args.script);
	const variant = resolveVariant(script, args.variant);
	const templateId = resolveTemplateId(script);
	const output = resolveOutput(script, variant);
	const issues = [];
	const pushIssue = createIssueFactory({fps: output.fps, issues});
	let normalized;

	if (templateId === "game-play-commentary") {
		normalized = normalizeGameplaySegments(script);
		analyzeGameplay({
			items: normalized.items,
			fps: output.fps,
			pushIssue,
		});
	} else if (templateId === "line-chat") {
		normalized = normalizeLineChat(script);
		analyzeLineChat({
			items: normalized.items,
			output,
			fps: output.fps,
			pushIssue,
		});
	} else {
		normalized = normalizeClipScenes(script, variant);
		analyzeClipScenes({
			items: normalized.items,
			output,
			fps: output.fps,
			variant,
			pushIssue,
		});
	}

	analyzeBgm({
		templateId,
		bgmSequence: normalized.bgmSequence,
		items: normalized.items,
		pushIssue,
	});

	const bySeverity = getDefaultSeverityCounts();
	const byCategory = getDefaultCategoryCounts();
	for (const issue of issues) {
		bySeverity[issue.severity] += 1;
		byCategory[issue.category] += 1;
	}

	const report = {
		version: 1,
		generatedAt: new Date().toISOString(),
		scriptPath: args.script,
		variant,
		templateId,
		output,
		summary: {
			totalItems: normalized.items.length,
			totalFrames: normalized.totalFrames,
			totalSeconds: Math.round((normalized.totalFrames / output.fps) * 100) / 100,
			issueCount: issues.length,
			blockingCount: issues.filter((issue) => issue.blocking).length,
			bySeverity,
			byCategory,
		},
		issues,
	};

	const feedbackTemplate = buildFeedbackTemplate({
		reportPath: args.output,
		variant,
		templateId,
		issues,
	});

	fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
	fs.writeFileSync(
		args.feedbackOutput,
		`${JSON.stringify(feedbackTemplate, null, 2)}\n`,
		"utf8",
	);

	process.stdout.write(
		`${JSON.stringify(
			{
				report: args.output,
				feedbackTemplate: args.feedbackOutput,
				templateId,
				variant,
				itemCount: normalized.items.length,
				issueCount: issues.length,
				blockingCount: report.summary.blockingCount,
			},
			null,
			2,
		)}\n`,
	);
};

main();
