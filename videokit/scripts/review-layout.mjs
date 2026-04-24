/* eslint-env node */
/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import {createDeliverableContext, writeJsonFile} from './deliverable-utils.mjs';
import {
	createRectFromBottom,
	createRectFromTop,
	getIntersectionRatio,
	getPopupLayoutBox,
	getSceneReadableZones,
	getSubtitleLayoutDefaults,
	resolveOutputSettings,
	rectArea,
} from './layout-contract-utils.mjs';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');

const parseArgs = () => {
	const args = process.argv.slice(2);
	let variant = 'all';
	let deliverableDir = null;
	let projectId = null;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--variant' && args[index + 1]) {
			variant = args[index + 1];
			index += 1;
			continue;
		}

		if (arg.startsWith('--variant=')) {
			variant = arg.slice('--variant='.length);
			continue;
		}

		if (arg === '--deliverable-dir' && args[index + 1]) {
			deliverableDir = args[index + 1];
			index += 1;
			continue;
		}

		if (arg.startsWith('--deliverable-dir=')) {
			deliverableDir = arg.slice('--deliverable-dir='.length);
			continue;
		}

		if (arg === '--project-id' && args[index + 1]) {
			projectId = args[index + 1];
			index += 1;
			continue;
		}

		if (arg.startsWith('--project-id=')) {
			projectId = arg.slice('--project-id='.length);
		}
	}

	return {variant, deliverableDir, projectId};
};

const createIssue = ({
	level = 'warning',
	variant,
	type,
	message,
	sceneId = null,
	sceneIndex = null,
	metrics = {},
}) => ({
	level,
	variant,
	type,
	message,
	sceneId,
	sceneIndex,
	metrics,
});

const isRectWithin = (inner, outer) =>
	inner.left >= outer.left
	&& inner.right <= outer.right
	&& inner.top >= outer.top
	&& inner.top + inner.height <= outer.top + outer.height;

const resolveVariants = (script, requestedVariant) => {
	if (script?.template?.id === 'line-chat' || Array.isArray(script?.timeline?.chat?.messages)) {
		return ['current'];
	}

	const hasGameplaySegments = Array.isArray(script?.timeline?.gameplay?.segments);
	if (hasGameplaySegments) {
		if (requestedVariant === 'both' || requestedVariant === 'all' || requestedVariant === 'current') {
			return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
		}
		return [requestedVariant];
	}

	if (requestedVariant === 'current') {
		return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
	}

	if (requestedVariant === 'both' || requestedVariant === 'all') {
		return ['long', 'short'].filter((item) => Array.isArray(script?.[item]?.scenes));
	}

	return [requestedVariant].filter((item) => Array.isArray(script?.[item]?.scenes));
};

const resolveSubtitleRect = ({
	width,
	height,
	scene,
	hasOverlap,
	templateId,
	gameplayDisplayMode,
}) => {
	const portrait = height > width;

	if (templateId === 'line-chat') {
		return createRectFromBottom({
			left: 6,
			bottom: 4.2,
			width: 88,
			height: 14,
		});
	}

	if (templateId === 'game-play-commentary' && gameplayDisplayMode !== 'explainer') {
		return createRectFromBottom({
			left: portrait ? 7 : 11,
			bottom: portrait ? 6 : 5.5,
			width: portrait ? 86 : 78,
			height: portrait ? 22 : 18,
		});
	}

	const defaults = getSubtitleLayoutDefaults({width, height, hasOverlap});
	const resolvedWidth = scene.subtitleWidth ?? defaults.widthPct;
	const resolvedHeight = scene.subtitleHeight ?? defaults.heightPct;
	const left = scene.subtitleX ?? (100 - resolvedWidth) / 2;
	const bottom = scene.subtitleY ?? defaults.bottomPct;

	return createRectFromBottom({
		left,
		bottom,
		width: resolvedWidth,
		height: resolvedHeight,
	});
};

const buildGameplayHudRects = ({width, height, showHud}) => {
	if (!showHud) {
		return [];
	}

	const portrait = height > width;
	return [
		createRectFromTop(portrait ? 3 : 3.2, portrait ? 2.2 : 2.8, portrait ? 42 : 38, portrait ? 18 : 18),
		createRectFromTop(portrait ? 56 : 62, portrait ? 2.2 : 2.8, portrait ? 41 : 33, portrait ? 18 : 18),
	];
};

const analyzeSceneLayout = ({
	scene,
	sceneIndex,
	variant,
	output,
	templateId,
	gameplayDisplayMode,
	showGameplayHud,
	hasOverlap,
}) => {
	const issues = [];
	const sceneId = scene.id ?? `scene_${sceneIndex}`;
	const popups = Array.isArray(scene.popups) ? scene.popups : [];
	const zones = getSceneReadableZones({
		width: output.width,
		height: output.height,
		visualMode: scene.sceneVisualMode ?? 'popupFocus',
		popupZone: scene.popupZone ?? 'auto',
		hasPopup: popups.length > 0,
	});
	const subtitleRect = resolveSubtitleRect({
		width: output.width,
		height: output.height,
		scene,
		hasOverlap,
		templateId,
		gameplayDisplayMode,
	});
	const popupBoxes = popups.map((popup) =>
		getPopupLayoutBox({
			width: output.width,
			height: output.height,
			x: popup.imageX,
			y: popup.imageY,
			popupWidth: popup.imageWidth ?? 25,
			popupHeight: popup.imageHeight ?? 40,
			visualMode: scene.sceneVisualMode ?? 'popupFocus',
			popupZone: popup.popupZone ?? scene.popupZone ?? 'auto',
			hasPopup: true,
		}),
	);
	const hudRects = templateId === 'game-play-commentary'
		? buildGameplayHudRects({
			width: output.width,
			height: output.height,
			showHud: showGameplayHud,
		})
		: [];
	const screenRect = createRectFromTop(0, 0, 100, 100);

	if (!isRectWithin(subtitleRect, screenRect)) {
		issues.push(
			createIssue({
				level: 'error',
				variant,
				type: 'subtitle-screen-overflow',
				message: '字幕エリアが画面外にはみ出しています。subtitleX / subtitleY / subtitleWidth / subtitleHeight を見直してください。',
				sceneId,
				sceneIndex,
				metrics: {
					subtitleRect,
					screenRect,
				},
			}),
		);
	}

	popupBoxes.forEach((popupRect, popupIndex) => {
		const subtitleOverlapRatio = getIntersectionRatio(popupRect, subtitleRect);
		if (subtitleOverlapRatio >= 0.12) {
			issues.push(
				createIssue({
					level: subtitleOverlapRatio >= 0.22 ? 'error' : 'warning',
					variant,
					type: 'popup-subtitle-overlap',
					message: 'popup が字幕可読域を侵食しています。popupZone か imageY を調整してください。',
					sceneId,
					sceneIndex,
					metrics: {
						popupIndex,
						subtitleOverlapRatio: Number(subtitleOverlapRatio.toFixed(3)),
					},
				}),
			);
		}

		hudRects.forEach((hudRect, hudIndex) => {
			const hudOverlapRatio = getIntersectionRatio(popupRect, hudRect);
			if (hudOverlapRatio >= 0.16) {
				issues.push(
					createIssue({
						level: 'warning',
						variant,
						type: 'popup-hud-overlap',
						message: 'popup が gameplay HUD と重なっています。popup の位置を上側または中央へ寄せてください。',
						sceneId,
						sceneIndex,
						metrics: {
							popupIndex,
							hudIndex,
							hudOverlapRatio: Number(hudOverlapRatio.toFixed(3)),
						},
					}),
				);
			}
		});
	});

	if (popups.length > 0 && rectArea(zones.backgroundRect) < 900) {
		issues.push(
			createIssue({
				level: 'warning',
				variant,
				type: 'background-room-small',
				message: 'popup 配置後の背景主表示エリアがかなり小さいです。visualMode か popupZone を見直してください。',
				sceneId,
				sceneIndex,
				metrics: {
					backgroundRect: zones.backgroundRect,
					backgroundArea: Number(rectArea(zones.backgroundRect).toFixed(1)),
				},
			}),
		);
	}

	return {
		issues,
		contract: {
			sceneId,
			sceneIndex,
			variant,
			visualMode: zones.resolvedVisualMode,
			popupZone: zones.resolvedPopupZone,
			safeRect: zones.safeRect,
			subtitleRect,
			popupRect: zones.popupRect,
			backgroundRect: zones.backgroundRect,
			popupBoxes,
			hudRects,
		},
	};
};

const analyzeChatLayout = ({script, variant, output}) => {
	const messages = Array.isArray(script?.timeline?.chat?.messages) ? script.timeline.chat.messages : [];
	const issues = [];
	const contracts = [];
	const subtitleRect = createRectFromBottom({
		left: 6,
		bottom: 4.2,
		width: 88,
		height: 14,
	});

	messages.forEach((message, index) => {
		const textLength = String(message.text ?? '').length;
		if (textLength > 42) {
			issues.push(
				createIssue({
					level: textLength > 60 ? 'error' : 'warning',
					variant,
					type: 'line-message-density',
					message: '1 メッセージの文字数が多く、bubble 内で詰まりやすいです。分割を検討してください。',
					sceneId: message.id ?? `msg_${index}`,
					sceneIndex: index,
					metrics: {
						textLength,
					},
				}),
			);
		}

		if (index > 0) {
			const currentReveal = Number(message.revealFrame ?? 0);
			const previousReveal = Number(messages[index - 1]?.revealFrame ?? 0);
			const gap = currentReveal - previousReveal;
			if (gap < 45) {
				issues.push(
					createIssue({
						level: gap < 24 ? 'error' : 'warning',
						variant,
						type: 'line-reveal-tight',
						message: 'message の reveal 間隔が短く、読み切る前に次が出る可能性があります。',
						sceneId: message.id ?? `msg_${index}`,
						sceneIndex: index,
						metrics: {
							revealGapFrames: gap,
						},
					}),
				);
			}
		}
	});

	contracts.push({
		sceneId: 'line-chat',
		sceneIndex: 0,
		variant,
		visualMode: 'template-fixed',
		popupZone: 'template-fixed',
		subtitleRect,
		screenRect: createRectFromTop(0, 0, 100, 100),
		output,
	});

	return {issues, contracts};
};

const main = () => {
	const options = parseArgs();
	const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
	const variants = resolveVariants(script, options.variant);
	const deliverableContext = createDeliverableContext({
		script,
		projectId: options.projectId,
		deliverableDir: options.deliverableDir,
		snapshotScript: true,
	});

	if (variants.length === 0) {
		throw new Error(`Variant "${options.variant}" does not contain scenes.`);
	}

	const allIssues = [];
	const allContracts = [];
	const templateId = script?.template?.id ?? 'yukkuri-explainer';

	variants.forEach((variant) => {
		const output = resolveOutputSettings({script, variant});

		if (templateId === 'line-chat' || Array.isArray(script?.timeline?.chat?.messages)) {
			const result = analyzeChatLayout({script, variant, output});
			allIssues.push(...result.issues);
			allContracts.push(...result.contracts);
			return;
		}

		const gameplaySegments = Array.isArray(script?.timeline?.gameplay?.segments)
			? script.timeline.gameplay.segments
			: null;
		const gameplayDisplayMode = script?.timeline?.gameplay?.displayMode ?? 'broadcast';
		const showGameplayHud = (script?.timeline?.gameplay?.showHud ?? (gameplayDisplayMode !== 'explainer')) === true;
		const scenes = gameplaySegments ?? script?.[variant]?.scenes ?? [];

		scenes.forEach((scene, sceneIndex) => {
			const hasOverlap = scenes.some((otherScene, otherIndex) => {
				if (sceneIndex === otherIndex) {
					return false;
				}
				const start = Number(scene.startTime ?? 0);
				const end = start + Number(scene.duration ?? 0);
				const otherStart = Number(otherScene.startTime ?? 0);
				const otherEnd = otherStart + Number(otherScene.duration ?? 0);
				return start < otherEnd && end > otherStart;
			});
			const result = analyzeSceneLayout({
				scene,
				sceneIndex,
				variant,
				output,
				templateId,
				gameplayDisplayMode,
				showGameplayHud,
				hasOverlap,
			});
			allIssues.push(...result.issues);
			allContracts.push(result.contract);
		});
	});

	const report = {
		generatedAt: new Date().toISOString(),
		scriptPath: SCRIPT_PATH,
		deliverableRoot: deliverableContext.paths.root,
		variants,
		summary: {
			totalIssues: allIssues.length,
			errors: allIssues.filter((issue) => issue.level === 'error').length,
			warnings: allIssues.filter((issue) => issue.level === 'warning').length,
			status: allIssues.length === 0 ? 'ok' : 'needs-review',
		},
		workflow: [
			'1. scene ごとの subtitle / popup / background の使い分けを決める',
			'2. npm run review:layout で可読域の衝突を確認する',
			'3. gameplay は HUD と lower-third の衝突も見る',
			'4. line-chat は message 密度と reveal 間隔を優先で見る',
		],
		contracts: allContracts,
		issues: allIssues,
	};

	writeJsonFile(deliverableContext.paths.reviewReportPaths.layout, report);
	console.log(`Wrote ${deliverableContext.paths.reviewReportPaths.layout}`);
	console.log(`Issues: ${report.summary.totalIssues} (errors: ${report.summary.errors}, warnings: ${report.summary.warnings})`);

	if (report.summary.errors > 0) {
		process.exitCode = 1;
	}
};

main();
