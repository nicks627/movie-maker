import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const defaultScriptPath = path.join(projectRoot, "src", "data", "script.json");
const defaultFeedbackPath = path.join(
	projectRoot,
	"review-feedback.generated.json",
);
const defaultApplyReportPath = path.join(
	projectRoot,
	"review-feedback-apply.generated.json",
);

const parseArgs = (argv) => {
	const parsed = {
		script: defaultScriptPath,
		feedback: defaultFeedbackPath,
		report: defaultApplyReportPath,
		dryRun: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--script") {
			parsed.script = path.resolve(projectRoot, argv[index + 1] ?? "");
			index += 1;
			continue;
		}
		if (arg === "--feedback") {
			parsed.feedback = path.resolve(projectRoot, argv[index + 1] ?? "");
			index += 1;
			continue;
		}
		if (arg === "--report") {
			parsed.report = path.resolve(projectRoot, argv[index + 1] ?? "");
			index += 1;
			continue;
		}
		if (arg === "--dry-run") {
			parsed.dryRun = true;
		}
	}

	return parsed;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeJson = (filePath, value) => {
	fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

const resolveVariant = (script, feedback) => {
	if (feedback.variant === "long" || feedback.variant === "short") {
		return feedback.variant;
	}
	if (script.activeVariant === "long" || script.activeVariant === "short") {
		return script.activeVariant;
	}
	return script.short ? "short" : "long";
};

const resolveTemplateId = (script, feedback) => {
	return feedback.templateId ?? script.template?.id ?? "yukkuri-explainer";
};

const getClipScenesRef = (script, variant) => {
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

const getGameplaySegmentsRef = (script) => {
	if (Array.isArray(script.timeline?.gameplay?.segments)) {
		return script.timeline.gameplay.segments;
	}
	return [];
};

const getLineChatMessagesRef = (script) => {
	if (Array.isArray(script.timeline?.chat?.messages)) {
		return script.timeline.chat.messages;
	}
	return [];
};

const getBgmSequenceRef = (script, variant) => {
	if (Array.isArray(script.timeline?.bgm)) {
		return {
			list: script.timeline.bgm,
			format: "canonical",
		};
	}
	if (Array.isArray(script?.[variant]?.bgm_sequence)) {
		return {
			list: script[variant].bgm_sequence,
			format: "legacy",
		};
	}
	if (script?.[variant]) {
		script[variant].bgm_sequence = [];
		return {
			list: script[variant].bgm_sequence,
			format: "legacy",
		};
	}
	return {
		list: [],
		format: "legacy",
	};
};

const isActionable = (item) =>
	item.status === "accepted" || item.status === "needs-agent";

const buildSequentialTiming = (items, kind) => {
	let cursor = 0;
	return items.map((item, index) => {
		if (kind === "line-chat") {
			const typingFrames = toNonNegativeInt(item.typingFrames, 0);
			const duration = Math.max(45, toPositiveInt(item.duration, 90));
			const startFrame = toNonNegativeInt(item.revealFrame, cursor + typingFrames);
			const endFrame = startFrame + duration;
			cursor = endFrame;
			return {
				index,
				id: item.id ?? `msg_${index + 1}`,
				startFrame,
				endFrame,
				duration,
			};
		}

		const duration = toPositiveInt(item.duration, 90);
		const startField = kind === "clip-scene" ? item.startTime : item.startTime;
		const startFrame = toNonNegativeInt(startField, cursor);
		const endFrame = startFrame + duration;
		cursor = endFrame;
		return {
			index,
			id: item.id ?? `${kind}_${index + 1}`,
			startFrame,
			endFrame,
			duration,
		};
	});
};

const shiftFollowingNumericField = (items, index, field, delta) => {
	if (!delta) {
		return;
	}
	for (let next = index + 1; next < items.length; next += 1) {
		if (typeof items[next][field] === "number") {
			items[next][field] = Math.max(0, items[next][field] + delta);
		}
	}
};

const findEntryIndex = ({items, timing, sceneId, timeRange}) => {
	if (sceneId) {
		const byId = timing.findIndex((entry) => entry.id === sceneId);
		if (byId !== -1) {
			return byId;
		}
	}
	if (timeRange) {
		const byTime = timing.findIndex((entry) => {
			return timeRange.startFrame >= entry.startFrame && timeRange.startFrame <= entry.endFrame;
		});
		if (byTime !== -1) {
			return byTime;
		}
	}
	return -1;
};

const findPopupIndex = ({popups, sceneStartFrame, fallbackTimeRange, patch}) => {
	if (!Array.isArray(popups) || popups.length === 0) {
		return -1;
	}
	if (typeof patch?.popupIndex === "number") {
		return patch.popupIndex >= 0 && patch.popupIndex < popups.length ? patch.popupIndex : -1;
	}
	if (popups.length === 1) {
		return 0;
	}
	if (fallbackTimeRange) {
		const matchedIndex = popups.findIndex((popup) => {
			const popupStart = sceneStartFrame + toNonNegativeInt(popup.startOffset, 0);
			const popupDuration = toPositiveInt(popup.duration, 90);
			const popupEnd = popupStart + popupDuration;
			return fallbackTimeRange.startFrame >= popupStart && fallbackTimeRange.startFrame <= popupEnd;
		});
		if (matchedIndex !== -1) {
			return matchedIndex;
		}
	}
	return 0;
};

const ensureSubtitleStyle = (scene) => {
	if (!scene.subtitleStyle || typeof scene.subtitleStyle !== "object") {
		scene.subtitleStyle = {};
	}
	return scene.subtitleStyle;
};

const ensureTransition = (target) => {
	if (!target.transition || typeof target.transition !== "object") {
		target.transition = {type: "dissolve", duration: 15};
	}
	return target.transition;
};

const ensureAudioConfig = (script) => {
	if (!script.audio || typeof script.audio !== "object") {
		script.audio = {};
	}
	return script.audio;
};

const addApplyEntry = (entries, feedbackId, status, message, extra = {}) => {
	entries.push({
		feedbackId,
		status,
		message,
		...extra,
	});
};

const applyClipSceneFeedback = ({script, variant, feedbackItem, entries}) => {
	const scenes = getClipScenesRef(script, variant);
	const timing = buildSequentialTiming(scenes, "clip-scene");
	const sceneIndex = findEntryIndex({
		items: scenes,
		timing,
		sceneId: feedbackItem.sceneId,
		timeRange: feedbackItem.timeRange,
	});
	if (sceneIndex === -1) {
		addApplyEntry(entries, feedbackItem.id, "skipped", "Scene could not be resolved");
		return;
	}

	const scene = scenes[sceneIndex];
	const sceneTiming = timing[sceneIndex];
	const patch = feedbackItem.patch ?? {};

	if (feedbackItem.action === "extend-scene") {
		const currentDuration = toPositiveInt(scene.duration, 90);
		const nextDuration =
			patch.durationFrames ??
			currentDuration + (patch.durationDeltaFrames ?? 30);
		const delta = nextDuration - currentDuration;
		scene.duration = Math.max(1, nextDuration);
		shiftFollowingNumericField(scenes, sceneIndex, "startTime", delta);
		addApplyEntry(entries, feedbackItem.id, "applied", "Scene duration extended", {
			sceneId: scene.id,
			deltaFrames: delta,
		});
		return;
	}

	if (feedbackItem.action === "rewrite-text" || feedbackItem.action === "shorten-text") {
		if (!patch.replacementText) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "replacementText is required");
			return;
		}
		scene.text = patch.replacementText;
		addApplyEntry(entries, feedbackItem.id, "applied", "Scene text updated", {
			sceneId: scene.id,
		});
		return;
	}

	if (feedbackItem.action === "reduce-font-size") {
		const subtitleStyle = ensureSubtitleStyle(scene);
		const currentFontSize = toPositiveInt(subtitleStyle.fontSize, 78);
		subtitleStyle.fontSize = patch.subtitleFontSize ?? Math.max(32, currentFontSize - 6);
		addApplyEntry(entries, feedbackItem.id, "applied", "Subtitle font size adjusted", {
			sceneId: scene.id,
		});
		return;
	}

	if (feedbackItem.action === "adjust-subtitle-box") {
		const currentWidth = typeof scene.subtitleWidth === "number" ? scene.subtitleWidth : 66;
		scene.subtitleWidth = patch.subtitleWidth ?? Math.min(96, currentWidth + 6);
		if (patch.subtitleFontSize) {
			ensureSubtitleStyle(scene).fontSize = patch.subtitleFontSize;
		}
		addApplyEntry(entries, feedbackItem.id, "applied", "Subtitle box adjusted", {
			sceneId: scene.id,
		});
		return;
	}

	if (feedbackItem.action === "extend-popup" || feedbackItem.action === "hold-component-longer") {
		const popupIndex = findPopupIndex({
			popups: scene.popups,
			sceneStartFrame: sceneTiming.startFrame,
			fallbackTimeRange: feedbackItem.timeRange,
			patch,
		});
		if (popupIndex === -1) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "Popup could not be resolved");
			return;
		}
		const popup = scene.popups[popupIndex];
		const currentDuration = toPositiveInt(popup.duration, 90);
		const nextDuration =
			feedbackItem.action === "hold-component-longer" || patch.holdUntilSceneEnd
				? Math.max(1, toPositiveInt(scene.duration, 90) - toNonNegativeInt(popup.startOffset, 0))
				: patch.popupDurationFrames ??
					currentDuration + (patch.popupDurationDeltaFrames ?? 30);
		popup.duration = Math.max(1, nextDuration);
		addApplyEntry(entries, feedbackItem.id, "applied", "Popup duration adjusted", {
			sceneId: scene.id,
			popupIndex,
		});
		return;
	}

	if (feedbackItem.action === "change-transition") {
		const popupIndex = findPopupIndex({
			popups: scene.popups,
			sceneStartFrame: sceneTiming.startFrame,
			fallbackTimeRange: feedbackItem.timeRange,
			patch,
		});
		const nextType = patch.transitionType ?? "dissolve";
		if (popupIndex !== -1) {
			const popup = scene.popups[popupIndex];
			const transition = ensureTransition(popup);
			transition.type = nextType;
			addApplyEntry(entries, feedbackItem.id, "applied", "Popup transition updated", {
				sceneId: scene.id,
				popupIndex,
				transitionType: nextType,
			});
			return;
		}
		const transition = ensureTransition(scene);
		transition.type = nextType;
		addApplyEntry(entries, feedbackItem.id, "applied", "Scene transition updated", {
			sceneId: scene.id,
			transitionType: nextType,
		});
		return;
	}

	if (feedbackItem.action === "replace-asset") {
		const popupIndex = findPopupIndex({
			popups: scene.popups,
			sceneStartFrame: sceneTiming.startFrame,
			fallbackTimeRange: feedbackItem.timeRange,
			patch,
		});
		if (patch.backgroundImage) {
			scene.bg_image = patch.backgroundImage;
			addApplyEntry(entries, feedbackItem.id, "applied", "Background image updated", {
				sceneId: scene.id,
			});
			return;
		}
		if (patch.backgroundVideo) {
			scene.bg_video = patch.backgroundVideo;
			addApplyEntry(entries, feedbackItem.id, "applied", "Background video updated", {
				sceneId: scene.id,
			});
			return;
		}
		if (patch.popupImage && popupIndex !== -1) {
			scene.popups[popupIndex].image = patch.popupImage;
			addApplyEntry(entries, feedbackItem.id, "applied", "Popup image updated", {
				sceneId: scene.id,
				popupIndex,
			});
			return;
		}
		if (patch.voiceFile) {
			scene.voiceFile = patch.voiceFile;
			addApplyEntry(entries, feedbackItem.id, "applied", "Voice file updated", {
				sceneId: scene.id,
			});
			return;
		}
		addApplyEntry(entries, feedbackItem.id, "skipped", "No replacement asset path was provided");
		return;
	}

	if (feedbackItem.action === "generate-voice") {
		if (!patch.voiceFile) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "voiceFile patch is required");
			return;
		}
		scene.voiceFile = patch.voiceFile;
		addApplyEntry(entries, feedbackItem.id, "applied", "Voice file assigned", {
			sceneId: scene.id,
		});
		return;
	}

	if (feedbackItem.action === "lower-bgm") {
		const audioConfig = ensureAudioConfig(script);
		const currentVolume =
			typeof audioConfig.bgmVolume === "number" ? audioConfig.bgmVolume : 0.15;
		audioConfig.bgmVolume = patch.bgmVolume ?? Math.max(0.03, currentVolume - 0.03);
		addApplyEntry(entries, feedbackItem.id, "applied", "Global BGM volume lowered", {
			bgmVolume: audioConfig.bgmVolume,
		});
		return;
	}

	if (feedbackItem.action === "change-bgm") {
		if (!patch.bgmFile) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "bgmFile patch is required");
			return;
		}
		const bgmRef = getBgmSequenceRef(script, variant);
		const existingEntry = bgmRef.list.find((entry) => {
			return bgmRef.format === "canonical"
				? toNonNegativeInt(entry.atScene, -1) === sceneIndex
				: toNonNegativeInt(entry.at_scene, -1) === sceneIndex;
		});
		if (existingEntry) {
			existingEntry.file = patch.bgmFile;
		} else if (bgmRef.format === "canonical") {
			bgmRef.list.push({atScene: sceneIndex, file: patch.bgmFile});
		} else {
			bgmRef.list.push({at_scene: sceneIndex, file: patch.bgmFile});
		}
		addApplyEntry(entries, feedbackItem.id, "applied", "BGM entry updated", {
			sceneId: scene.id,
			bgmFile: patch.bgmFile,
		});
		return;
	}

	addApplyEntry(entries, feedbackItem.id, "skipped", "This action requires manual handling");
};

const applyGameplayFeedback = ({script, feedbackItem, entries}) => {
	const segments = getGameplaySegmentsRef(script);
	const timing = buildSequentialTiming(segments, "gameplay");
	const segmentIndex = findEntryIndex({
		items: segments,
		timing,
		sceneId: feedbackItem.sceneId,
		timeRange: feedbackItem.timeRange,
	});
	if (segmentIndex === -1) {
		addApplyEntry(entries, feedbackItem.id, "skipped", "Gameplay segment could not be resolved");
		return;
	}

	const segment = segments[segmentIndex];
	const patch = feedbackItem.patch ?? {};

	if (feedbackItem.action === "extend-scene") {
		const currentDuration = toPositiveInt(segment.duration, 90);
		const nextDuration =
			patch.durationFrames ??
			currentDuration + (patch.durationDeltaFrames ?? 30);
		const delta = nextDuration - currentDuration;
		segment.duration = Math.max(1, nextDuration);
		shiftFollowingNumericField(segments, segmentIndex, "startTime", delta);
		addApplyEntry(entries, feedbackItem.id, "applied", "Gameplay segment extended", {
			sceneId: segment.id,
		});
		return;
	}

	if (feedbackItem.action === "rewrite-text" || feedbackItem.action === "shorten-text") {
		if (!patch.replacementText) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "replacementText is required");
			return;
		}
		segment.text = patch.replacementText;
		addApplyEntry(entries, feedbackItem.id, "applied", "Gameplay text updated", {
			sceneId: segment.id,
		});
		return;
	}

	if (feedbackItem.action === "adjust-gameplay-trim") {
		if (patch.gameplayTrimBefore !== undefined) {
			segment.trimBefore = patch.gameplayTrimBefore;
		}
		if (patch.gameplaySourceDuration !== undefined) {
			segment.sourceDuration = patch.gameplaySourceDuration;
		}
		if (
			patch.gameplayTrimBefore === undefined &&
			patch.gameplaySourceDuration === undefined
		) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "trim patch values are required");
			return;
		}
		addApplyEntry(entries, feedbackItem.id, "applied", "Gameplay trim updated", {
			sceneId: segment.id,
		});
		return;
	}

	if (feedbackItem.action === "generate-voice" && patch.voiceFile) {
		segment.voiceFile = patch.voiceFile;
		addApplyEntry(entries, feedbackItem.id, "applied", "Gameplay voice file assigned", {
			sceneId: segment.id,
		});
		return;
	}

	addApplyEntry(entries, feedbackItem.id, "skipped", "This gameplay action requires manual handling");
};

const applyLineChatFeedback = ({script, feedbackItem, entries}) => {
	const messages = getLineChatMessagesRef(script);
	const timing = buildSequentialTiming(messages, "line-chat");
	const messageIndex = findEntryIndex({
		items: messages,
		timing,
		sceneId: feedbackItem.sceneId,
		timeRange: feedbackItem.timeRange,
	});
	if (messageIndex === -1) {
		addApplyEntry(entries, feedbackItem.id, "skipped", "Chat message could not be resolved");
		return;
	}

	const message = messages[messageIndex];
	const patch = feedbackItem.patch ?? {};

	if (feedbackItem.action === "adjust-chat-timing") {
		const currentDuration = Math.max(45, toPositiveInt(message.duration, 90));
		const nextDuration =
			patch.durationFrames ??
			currentDuration + (patch.durationDeltaFrames ?? 18);
		const delta = nextDuration - currentDuration;
		message.duration = Math.max(45, nextDuration);
		shiftFollowingNumericField(messages, messageIndex, "revealFrame", delta);
		addApplyEntry(entries, feedbackItem.id, "applied", "Chat timing adjusted", {
			sceneId: message.id,
		});
		return;
	}

	if (feedbackItem.action === "rewrite-text" || feedbackItem.action === "shorten-text") {
		if (!patch.replacementText) {
			addApplyEntry(entries, feedbackItem.id, "skipped", "replacementText is required");
			return;
		}
		message.text = patch.replacementText;
		addApplyEntry(entries, feedbackItem.id, "applied", "Chat text updated", {
			sceneId: message.id,
		});
		return;
	}

	if (feedbackItem.action === "generate-voice" && patch.voiceFile) {
		message.voiceFile = patch.voiceFile;
		addApplyEntry(entries, feedbackItem.id, "applied", "Chat voice file assigned", {
			sceneId: message.id,
		});
		return;
	}

	addApplyEntry(entries, feedbackItem.id, "skipped", "This chat action requires manual handling");
};

const main = () => {
	const args = parseArgs(process.argv.slice(2));
	const script = readJson(args.script);
	const feedback = readJson(args.feedback);
	const variant = resolveVariant(script, feedback);
	const templateId = resolveTemplateId(script, feedback);
	const entries = [];

	for (const item of feedback.items ?? []) {
		if (!isActionable(item)) {
			continue;
		}

		if (item.action === "keep-as-is") {
			addApplyEntry(entries, item.id, "kept", "Marked as keep-as-is");
			continue;
		}

		if (templateId === "game-play-commentary") {
			applyGameplayFeedback({
				script,
				feedbackItem: item,
				entries,
			});
			continue;
		}

		if (templateId === "line-chat") {
			applyLineChatFeedback({
				script,
				feedbackItem: item,
				entries,
			});
			continue;
		}

		applyClipSceneFeedback({
			script,
			variant,
			feedbackItem: item,
			entries,
		});
	}

	const report = {
		version: 1,
		createdAt: new Date().toISOString(),
		scriptPath: args.script,
		feedbackPath: args.feedback,
		variant,
		templateId,
		dryRun: args.dryRun,
		appliedCount: entries.filter((entry) => entry.status === "applied").length,
		skippedCount: entries.filter((entry) => entry.status === "skipped").length,
		keptCount: entries.filter((entry) => entry.status === "kept").length,
		entries,
	};

	if (!args.dryRun) {
		writeJson(args.script, script);
	}
	writeJson(args.report, report);

	process.stdout.write(
		`${JSON.stringify(
			{
				script: args.script,
				feedback: args.feedback,
				report: args.report,
				appliedCount: report.appliedCount,
				skippedCount: report.skippedCount,
				keptCount: report.keptCount,
				dryRun: args.dryRun,
			},
			null,
			2,
		)}\n`,
	);
};

main();
