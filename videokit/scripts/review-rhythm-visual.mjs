import fs from 'node:fs';
import path from 'node:path';
import {getAudioDurationInSeconds} from 'get-audio-duration';
import {createDeliverableContext, writeJsonFile} from './deliverable-utils.mjs';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'data', 'script.json');
const DEFAULT_FPS = 30;

const LIMITS = {
	long: {
		speechGapWarningFrames: 18,
		speechGapErrorFrames: 42,
		complexSpeechGapWarningFrames: 42,
		complexSpeechGapErrorFrames: 84,
		endingSilenceWarningFrames: 36,
		endingSilenceErrorFrames: 78,
		staticSceneWarningFrames: 270,
		staticSceneErrorFrames: 420,
		visualStreakWarningFrames: 390,
	},
	short: {
		speechGapWarningFrames: 10,
		speechGapErrorFrames: 24,
		complexSpeechGapWarningFrames: 24,
		complexSpeechGapErrorFrames: 54,
		endingSilenceWarningFrames: 18,
		endingSilenceErrorFrames: 42,
		staticSceneWarningFrames: 132,
		staticSceneErrorFrames: 220,
		visualStreakWarningFrames: 210,
	},
};

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

const selectedVariants = (script, requestedVariant) => {
	const hasGameplaySegments = Array.isArray(script?.timeline?.gameplay?.segments);

	if (hasGameplaySegments) {
		if (requestedVariant === 'current') {
			return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
		}

		if (requestedVariant === 'both' || requestedVariant === 'all') {
			return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
		}

		return [requestedVariant];
	}

	if (requestedVariant === 'current') {
		return [script.activeVariant ?? script.project?.defaultVariant ?? 'long'];
	}

	if (requestedVariant === 'both' || requestedVariant === 'all') {
		return ['long', 'short'].filter((variant) => Array.isArray(script?.[variant]?.scenes));
	}

	return [requestedVariant].filter((variant) => Array.isArray(script?.[variant]?.scenes));
};

const createIssue = ({
	level = 'warning',
	variant,
	type,
	message,
	sceneId,
	sceneIndex,
	current,
	expected,
	metrics = {},
}) => ({
	level,
	variant,
	type,
	message,
	sceneId: sceneId ?? null,
	sceneIndex: sceneIndex ?? null,
	current: current ?? null,
	expected: expected ?? null,
	metrics,
});

const resolveVoicePath = (scene, index) => {
	const filename = scene.voiceFile ?? `${scene.id ?? `scene_${index}`}.wav`;
	return path.join(process.cwd(), 'public', 'voices', filename);
};

const hasTransition = (transition) =>
	Boolean(transition && transition.type && transition.type !== 'none' && Number(transition.duration ?? 0) > 0);

const hasCameraMotion = (sceneEffect) =>
	Boolean(
		sceneEffect?.cameraMotion
		&& sceneEffect.cameraMotion.type
		&& sceneEffect.cameraMotion.type !== 'none',
	);

const hasOverlay = (sceneEffect) =>
	Boolean(sceneEffect?.overlay && sceneEffect.overlay.type && sceneEffect.overlay.type !== 'none');

const getPopupVisualWeight = (popup) => {
	let weight = 0;
	if (popup?.component) {
		weight += 2;
	}
	if (popup?.image) {
		weight += 2;
	}
	if (popup?.props && Object.keys(popup.props).length > 0) {
		weight += 1;
	}
	if (popup?.effect && popup.effect.type && popup.effect.type !== 'none') {
		weight += 1;
	}
	if (typeof popup?.text === 'string' && popup.text.trim().length > 0) {
		weight += 0.5;
	}
	return weight;
};

const getSceneVisualComplexity = (scene, previousScene) => {
	const popups = Array.isArray(scene?.popups) ? scene.popups : [];
	const popupWeight = popups.reduce((sum, popup) => sum + getPopupVisualWeight(popup), 0);
	let score = 0;

	if (scene?.bg_video) {
		score += 3;
	} else if (scene?.bg_image) {
		score += previousScene?.bg_image && previousScene.bg_image === scene.bg_image ? 1 : 2;
	}

	score += Math.min(3, popupWeight);

	if (hasTransition(scene?.transition)) {
		score += 1;
	}

	if (scene?.sceneEffect?.stylePreset) {
		score += 1;
	}

	if (hasCameraMotion(scene?.sceneEffect)) {
		score += 1;
	}

	if (hasOverlay(scene?.sceneEffect)) {
		score += 0.5;
	}

	if (scene?.sceneEffect?.filmGrain || scene?.sceneEffect?.vignette || scene?.sceneEffect?.colorGrade || scene?.sceneEffect?.cameraShake) {
		score += 0.5;
	}

	if (scene?.speaker && previousScene?.speaker && scene.speaker !== previousScene.speaker) {
		score += 0.5;
	}

	return Number(score.toFixed(2));
};

const isVisualLean = (scene, previousScene) => getSceneVisualComplexity(scene, previousScene) <= 1.5;

const isComplexDisplayScene = (scene, previousScene) => {
	const popups = Array.isArray(scene?.popups) ? scene.popups : [];
	const popupWeight = popups.reduce((sum, popup) => sum + getPopupVisualWeight(popup), 0);
	return Boolean(
		scene?.bg_video
		|| popupWeight >= 3
		|| popups.length >= 2
		|| hasCameraMotion(scene?.sceneEffect)
		|| getSceneVisualComplexity(scene, previousScene) >= 4,
	);
};

const getVisualFingerprint = (scene) => {
	const popups = Array.isArray(scene?.popups) ? scene.popups : [];
	const popupSignature = popups
		.map((popup) => popup?.component ?? popup?.image ?? popup?.effect?.type ?? 'generic')
		.join('|');

	return [
		scene?.bg_image ?? '',
		scene?.bg_video ?? '',
		popupSignature,
		scene?.sceneEffect?.stylePreset ?? '',
		scene?.sceneEffect?.overlay?.type ?? '',
		hasCameraMotion(scene?.sceneEffect) ? 'motion' : '',
	].join('::');
};

const getSpeechDurationFrames = async (scene, index, fps) => {
	const voicePath = resolveVoicePath(scene, index);
	if (!fs.existsSync(voicePath)) {
		return null;
	}

	const durationSeconds = await getAudioDurationInSeconds(voicePath);
	return Math.ceil(durationSeconds * fps);
};

const analyzeVariant = async ({script, variant}) => {
	const issues = [];
	const isGameplayScript = Array.isArray(script?.timeline?.gameplay?.segments);
	const scenes = isGameplayScript ? script.timeline.gameplay.segments : (script?.[variant]?.scenes ?? []);
	const fps = Number(script?.output?.fps ?? DEFAULT_FPS) || DEFAULT_FPS;
	const limits = LIMITS[variant] ?? LIMITS.long;

	const speechDurations = await Promise.all(
		scenes.map((scene, index) => getSpeechDurationFrames(scene, index, fps)),
	);

	let leanVisualStreakFrames = 0;
	let leanVisualStreakStartIndex = null;
	let leanVisualStreakFingerprint = null;
	let leanVisualStreakReported = false;

	for (let index = 0; index < scenes.length; index += 1) {
		const scene = scenes[index];
		const previousScene = index > 0 ? scenes[index - 1] : null;
		const nextScene = index < scenes.length - 1 ? scenes[index + 1] : null;
		const sceneId = scene.id ?? `scene_${index}`;
		const sceneDuration = Number(scene.duration ?? 0) || 0;
		const sceneStart = Number(scene.startTime ?? 0) || 0;
		const speechFrames = speechDurations[index];
		const effectiveSpeechFrames = speechFrames === null ? null : Math.min(sceneDuration, speechFrames);
		const visualComplexity = getSceneVisualComplexity(scene, previousScene);
		const currentFingerprint = getVisualFingerprint(scene);
		const leanVisual = isVisualLean(scene, previousScene);
		const complexDisplay = isComplexDisplayScene(scene, previousScene);

		if (leanVisual && sceneDuration >= limits.staticSceneWarningFrames) {
			const level = sceneDuration >= limits.staticSceneErrorFrames ? 'error' : 'warning';
			issues.push(
				createIssue({
					level,
					variant,
					type: 'visual-static-scene',
					message: '画面変化が少ないシーンが長めです。背景差し替え、popup、cameraMotion、transition のどれかを追加してください。',
					sceneId,
					sceneIndex: index,
					current: sceneDuration,
					expected: `< ${limits.staticSceneWarningFrames} frames`,
					metrics: {
						sceneDurationSeconds: Number((sceneDuration / fps).toFixed(2)),
						visualComplexity,
						background: scene.bg_video ?? scene.bg_image ?? null,
					},
				}),
			);
		}

		if (
			leanVisual
			&& previousScene
			&& leanVisualStreakFingerprint === currentFingerprint
		) {
			leanVisualStreakFrames += sceneDuration;
		} else if (leanVisual) {
			leanVisualStreakFrames = sceneDuration;
			leanVisualStreakStartIndex = index;
			leanVisualStreakFingerprint = currentFingerprint;
			leanVisualStreakReported = false;
		} else {
			leanVisualStreakFrames = 0;
			leanVisualStreakStartIndex = null;
			leanVisualStreakFingerprint = null;
			leanVisualStreakReported = false;
		}

		if (
			leanVisual
			&& !leanVisualStreakReported
			&& leanVisualStreakFrames >= limits.visualStreakWarningFrames
			&& leanVisualStreakStartIndex !== null
		) {
			issues.push(
				createIssue({
					level: 'warning',
					variant,
					type: 'visual-static-streak',
					message: '同じ見た目のまま低変化シーンが続いています。背景、図版、popup、motion のどれかで節目を作ってください。',
					sceneId,
					sceneIndex: index,
					current: leanVisualStreakFrames,
					expected: `< ${limits.visualStreakWarningFrames} frames`,
					metrics: {
						streakStartSceneIndex: leanVisualStreakStartIndex,
						streakSeconds: Number((leanVisualStreakFrames / fps).toFixed(2)),
						visualComplexity,
						fingerprint: currentFingerprint,
					},
				}),
			);
			leanVisualStreakReported = true;
		}

		if (effectiveSpeechFrames !== null) {
			if (speechFrames > sceneDuration + 3) {
				issues.push(
					createIssue({
						level: 'error',
						variant,
						type: 'voice-overflow',
						message: '読み上げ音声が scene の尺を超えています。scene.duration を伸ばすか speechText を短くしてください。',
						sceneId,
						sceneIndex: index,
						current: speechFrames,
						expected: `<= ${sceneDuration} frames`,
						metrics: {
							speechSeconds: Number((speechFrames / fps).toFixed(2)),
							sceneDurationSeconds: Number((sceneDuration / fps).toFixed(2)),
						},
					}),
				);
			}

			if (nextScene) {
				const nextSceneStart = Number(nextScene.startTime ?? 0) || 0;
				const speechGapFrames = nextSceneStart - (sceneStart + effectiveSpeechFrames);
				const warningThreshold = complexDisplay
					? limits.complexSpeechGapWarningFrames
					: limits.speechGapWarningFrames;
				const errorThreshold = complexDisplay
					? limits.complexSpeechGapErrorFrames
					: limits.speechGapErrorFrames;

				if (speechGapFrames > warningThreshold) {
					issues.push(
						createIssue({
							level: speechGapFrames > errorThreshold ? 'error' : 'warning',
							variant,
							type: 'speech-gap',
							message: '次のセリフまでの無音が長めです。scene.duration を詰めるか、次の scene.startTime を前に寄せてください。',
							sceneId,
							sceneIndex: index,
							current: speechGapFrames,
							expected: `<= ${warningThreshold} frames`,
							metrics: {
								gapSeconds: Number((speechGapFrames / fps).toFixed(2)),
								nextSceneId: nextScene.id ?? `scene_${index + 1}`,
								nextSceneIndex: index + 1,
								visualComplexity,
								complexDisplay,
							},
						}),
					);
				}
			} else {
				const endingSilenceFrames = sceneDuration - effectiveSpeechFrames;
				if (endingSilenceFrames > limits.endingSilenceWarningFrames) {
					issues.push(
						createIssue({
							level: endingSilenceFrames > limits.endingSilenceErrorFrames ? 'error' : 'warning',
							variant,
							type: 'ending-silence',
							message: '最後の scene の読み終わり後に無音が残りすぎています。締めの余韻なら短く、必要なら視覚変化を足してください。',
							sceneId,
							sceneIndex: index,
							current: endingSilenceFrames,
							expected: `<= ${limits.endingSilenceWarningFrames} frames`,
							metrics: {
								endingSilenceSeconds: Number((endingSilenceFrames / fps).toFixed(2)),
								visualComplexity,
							},
						}),
					);
				}
			}
		}
	}

	return issues;
};

const main = async () => {
	const options = parseArgs();
	const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
	const variants = selectedVariants(script, options.variant);
	const deliverableContext = createDeliverableContext({
		script,
		projectId: options.projectId,
		deliverableDir: options.deliverableDir,
		snapshotScript: true,
	});

	if (variants.length === 0) {
		throw new Error(`Variant "${options.variant}" does not contain scenes.`);
	}

	const issueGroups = await Promise.all(
		variants.map((variant) => analyzeVariant({script, variant})),
	);
	const issues = issueGroups.flat();
	const report = {
		generatedAt: new Date().toISOString(),
		scriptPath: SCRIPT_PATH,
		deliverableRoot: deliverableContext.paths.root,
		variants,
		summary: {
			totalIssues: issues.length,
			errors: issues.filter((issue) => issue.level === 'error').length,
			warnings: issues.filter((issue) => issue.level === 'warning').length,
			status: issues.length === 0 ? 'ok' : 'needs-review',
		},
		workflow: [
			'1. 台本と scene 割りを作る',
			'2. npm run review:preflight で text / speech / 音量 / 無音ギャップ / 画面停滞 を確認する',
			'3. 声の切れ目が長い scene は duration か startTime を詰める',
			'4. 単調な画面は background / popup / cameraMotion / transition で節目を作る',
		],
		issues,
	};

	writeJsonFile(deliverableContext.paths.reviewReportPaths.rhythmVisual, report);

	console.log(`Wrote ${deliverableContext.paths.reviewReportPaths.rhythmVisual}`);
	console.log(`Issues: ${report.summary.totalIssues} (errors: ${report.summary.errors}, warnings: ${report.summary.warnings})`);

	if (report.summary.errors > 0) {
		process.exitCode = 1;
	}
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
