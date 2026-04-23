import fs from 'fs';
import path from 'path';
import {buildBgmSequenceForScenes, buildExplainerAudioPlan} from './audio-asset-optimizer.mjs';

const SCRIPT_PATH = path.resolve('src/data/script.json');
const DEFAULT_SHORT_CONFIG = {
	width: 1080,
	height: 1920,
	fps: 30,
};
const SHORT_MODES = {
	lead: {
		targetFrames: 720,
		minScenes: 5,
		maxScenes: 6,
		ratio: 0.34,
	},
	summary: {
		targetFrames: 900,
		minScenes: 6,
		maxScenes: 8,
		ratio: 0.45,
	},
	trim: {
		targetFrames: 840,
		minScenes: 6,
		maxScenes: 8,
		ratio: 0.42,
	},
};

const parseArgs = () => {
	const args = process.argv.slice(2);
	let from = 'long';
	let activate = false;
	let mode;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--from' && args[index + 1]) {
			from = args[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--from=')) {
			from = arg.slice('--from='.length);
			continue;
		}
		if (arg === '--mode' && args[index + 1]) {
			mode = args[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--mode=')) {
			mode = arg.slice('--mode='.length);
			continue;
		}
		if (arg === '--activate-short') {
			activate = true;
		}
	}

	return {from, activate, mode};
};

const readScript = () => JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));

const resolveShortMode = (script, requestedMode) => {
	const mode = requestedMode
		?? script?.short?.generationMode
		?? process.env.SHORT_MODE
		?? 'summary';

	if (!(mode in SHORT_MODES)) {
		throw new Error(`Unsupported short mode "${mode}". Use one of: ${Object.keys(SHORT_MODES).join(', ')}`);
	}

	return mode;
};

const getLegacyVariant = (script, variant) => {
	const data = script?.[variant];
	if (!data || !Array.isArray(data.scenes) || data.scenes.length === 0) {
		return null;
	}

	return {
		kind: variant,
		scenes: data.scenes,
		bgmSequence: Array.isArray(data.bgm_sequence)
			? data.bgm_sequence
			: typeof data.bgm === 'string' && data.bgm.length > 0
				? [{at_scene: 0, file: data.bgm}]
				: [],
		characterScale: typeof data.characterScale === 'number' ? data.characterScale : undefined,
		config: data.config,
	};
};

const getCanonicalTimeline = (script) => {
	if (!Array.isArray(script?.timeline?.scenes) || script.timeline.scenes.length === 0) {
		return null;
	}

	return {
		kind: 'timeline',
		scenes: script.timeline.scenes,
		bgmSequence: Array.isArray(script.timeline?.bgm)
			? script.timeline.bgm.map((entry) => ({
				at_scene: entry.atScene,
				file: entry.file,
			}))
			: [],
		characterScale: undefined,
		config: script.output,
	};
};

const resolveSource = (script, requestedVariant) => {
	if (requestedVariant === 'active' && script?.activeVariant) {
		const activeVariant = getLegacyVariant(script, script.activeVariant);
		if (activeVariant) {
			return activeVariant;
		}
	}

	const requestedVariantData = getLegacyVariant(script, requestedVariant);
	if (requestedVariantData) {
		return requestedVariantData;
	}

	return (
		getLegacyVariant(script, 'long')
		?? getLegacyVariant(script, 'short')
		?? getCanonicalTimeline(script)
	);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeText = (value = '') =>
	value
		.replace(/\s+/g, ' ')
		.replace(/\n+/g, ' ')
		.trim();

const splitSentences = (value = '') => {
	const matches = normalizeText(value).match(/[^。!?！？]+[。!?！？]?/g);
	return (matches ?? [normalizeText(value)]).map((part) => part.trim()).filter(Boolean);
};

const takeNaturalExcerpt = (value, maxChars) => {
	const normalized = normalizeText(value);
	if (normalized.length <= maxChars) {
		return normalized;
	}

	const searchStart = Math.max(0, Math.floor(maxChars * 0.55));
	const breakChars = ['。', '、', '！', '？', ' ', '　'];
	let bestIndex = -1;

	for (let index = maxChars; index >= searchStart; index -= 1) {
		if (breakChars.includes(normalized[index])) {
			bestIndex = index;
			break;
		}
	}

	if (bestIndex === -1) {
		return `${normalized.slice(0, maxChars).trim()}…`;
	}

	return normalized.slice(0, bestIndex + 1).trim();
};

const removeNarrationScaffolding = (value) =>
	value
		.replace(/^今日は、?/, '')
		.replace(/^ここから先は、?/, '')
		.replace(/^結論なのだ。?/, '')
		.replace(/^結論よ。?/, '')
		.replace(/^結論です。?/, '')
		.trim();

const buildLeadText = (scene, index, totalScenes) => {
	if (index === 0) {
		return 'AI時代の最終保管庫、実は磁気テープが握っているの。';
	}

	if (index === totalScenes - 1) {
		return '富士フイルムがなぜ本命候補なのか、詳しくはロング版で確認してほしいのだ。';
	}

	const firstSentence = removeNarrationScaffolding(splitSentences(scene.text ?? '')[0] ?? '');
	if (/なぜ今/.test(firstSentence) || /3つ/.test(scene.text ?? '')) {
		return 'なぜ今テープなのか。理由はコストとAI需要、そしてESGなのだ。';
	}
	if (/IBM|LTO|40TB|50TB|1PB/i.test(scene.text ?? '')) {
		return takeNaturalExcerpt(firstSentence, 40);
	}

	return takeNaturalExcerpt(firstSentence, 38);
};

const buildSummaryText = (scene, index, totalScenes) => {
	const text = scene.text ?? '';
	const sentences = splitSentences(text).map(removeNarrationScaffolding).filter(Boolean);
	const firstSentence = sentences[0] ?? '';
	const secondSentence = sentences[1] ?? '';

	if (index === totalScenes - 1) {
		return 'AI時代の低頻度データを支える首位プレイヤーとして、富士フイルムは要注目なのだ。';
	}
	if (/なぜ今/.test(firstSentence) || /3つ/.test(text)) {
		return '磁気テープの追い風は、コスト、AI学習データ、ESGの3つなの。';
	}
	if (/IBM|LTO|40TB|50TB|1PB/i.test(text)) {
		return takeNaturalExcerpt(firstSentence, 52);
	}
	if (firstSentence.length <= 36 && secondSentence) {
		return takeNaturalExcerpt(`${firstSentence}${secondSentence}`, 58);
	}

	return takeNaturalExcerpt(firstSentence, 54);
};

const buildTrimText = (scene) => {
	const firstSentence = removeNarrationScaffolding(splitSentences(scene.text ?? '')[0] ?? '');
	return takeNaturalExcerpt(firstSentence, 46);
};

const buildShortText = (scene, index, totalScenes, mode) => {
	if (scene.shortTexts?.[mode]) {
		return normalizeText(scene.shortTexts[mode]);
	}
	if (mode === 'lead') {
		return buildLeadText(scene, index, totalScenes);
	}
	if (mode === 'trim') {
		return buildTrimText(scene);
	}
	return buildSummaryText(scene, index, totalScenes);
};

const getSceneScore = (scene, index, totalScenes) => {
	const text = scene.text ?? '';
	const popupCount = Array.isArray(scene.popups) ? scene.popups.length : 0;
	const hasComponentPopup = popupCount > 0 && scene.popups.some((popup) => popup.component);
	const emphasisScore = /[!?！？]/.test(text) ? 14 : 0;
	const textScore = Math.min(36, Math.ceil(text.length / 5));
	const edgeBonus = index === 0 || index === totalScenes - 1 ? 40 : 0;

	return edgeBonus + popupCount * 18 + (hasComponentPopup ? 20 : 0) + emphasisScore + textScore;
};

const pickSceneIndexes = (scenes, modeConfig) => {
	const totalScenes = scenes.length;
	if (totalScenes <= modeConfig.maxScenes) {
		return scenes.map((_, index) => index);
	}

	const targetCount = clamp(
		Math.ceil(totalScenes * modeConfig.ratio),
		modeConfig.minScenes,
		modeConfig.maxScenes
	);
	const selected = new Set([0, totalScenes - 1]);
	const scored = scenes
		.map((scene, index) => ({
			index,
			score: getSceneScore(scene, index, totalScenes),
		}))
		.sort((a, b) => b.score - a.score);

	for (const item of scored) {
		if (selected.size >= targetCount) {
			break;
		}
		selected.add(item.index);
	}

	for (let slot = 1; selected.size < targetCount; slot += 1) {
		const candidateIndex = Math.round((slot / (targetCount - 1)) * (totalScenes - 1));
		selected.add(candidateIndex);
		if (slot > totalScenes * 2) {
			break;
		}
	}

	return Array.from(selected).sort((a, b) => a - b);
};

const getDerivedSceneDuration = (scene, index, totalScenes, preparedText, modeConfig) => {
	const popupCount = Array.isArray(scene.popups) ? scene.popups.length : 0;
	const hasComponentPopup = popupCount > 0 && scene.popups.some((popup) => popup.component);
	const edgeBonus = index === 0 || index === totalScenes - 1 ? 10 : 0;
	const popupBonus = popupCount > 0 ? 10 : 0;
	const componentBonus = hasComponentPopup ? 8 : 0;
	const textBonus = Math.min(24, Math.ceil((preparedText?.length ?? 0) / 6));
	const modeBonus = modeConfig.targetFrames <= 760 ? -8 : modeConfig.targetFrames >= 880 ? 4 : 0;

	return clamp(64 + edgeBonus + popupBonus + componentBonus + textBonus + modeBonus, 56, 132);
};

const normalizePopups = (popups, sceneDuration) => {
	if (!Array.isArray(popups) || popups.length === 0) {
		return popups;
	}

	return popups.map((popup, index) => {
		const maxLead = Math.max(0, sceneDuration - 36);
		const startOffset = clamp(
			typeof popup.startOffset === 'number' ? popup.startOffset : 6 + index * 4,
			0,
			maxLead
		);
		const availableDuration = Math.max(30, sceneDuration - startOffset - 6);
		const duration = clamp(
			typeof popup.duration === 'number' ? popup.duration : availableDuration,
			30,
			availableDuration
		);

		return {
			...popup,
			startOffset,
			duration,
		};
	});
};

const scaleDurationsToTarget = (durations, targetFrames, modeConfig) => {
	const total = durations.reduce((sum, duration) => sum + duration, 0);
	if (total <= targetFrames) {
		return durations;
	}

	const ratio = targetFrames / total;
	return durations.map((duration, index) => {
		const minimum = index === 0 || index === durations.length - 1
			? Math.max(60, modeConfig.targetFrames <= 760 ? 52 : 64)
			: Math.max(48, modeConfig.targetFrames <= 760 ? 46 : 56);
		return Math.max(minimum, Math.round(duration * ratio));
	});
};

const buildShortScenes = (sourceScenes, mode) => {
	const modeConfig = SHORT_MODES[mode];
	const selectedIndexes = pickSceneIndexes(sourceScenes, modeConfig);
	const selectedScenes = selectedIndexes.map((index) => sourceScenes[index]);
	const preparedTexts = selectedScenes.map((scene, index) =>
		buildShortText(scene, index, selectedScenes.length, mode)
	);
	const baseDurations = selectedScenes.map((scene, index) =>
		getDerivedSceneDuration(scene, index, selectedScenes.length, preparedTexts[index], modeConfig)
	);
	const durations = scaleDurationsToTarget(baseDurations, modeConfig.targetFrames, modeConfig);

	let cursor = 0;
	const scenes = selectedScenes.map((scene, index) => {
		const duration = durations[index];
		const normalizedPopups = normalizePopups(scene.popups, duration);
		const originalId = scene.id ?? `scene_${index + 1}`;
		const nextScene = {
			...scene,
			id: originalId,
			text: preparedTexts[index],
			startTime: cursor,
			duration,
			voiceFile: `short_${mode}_${originalId}.wav`,
			popups: normalizedPopups,
		};
		cursor += duration;
		return nextScene;
	});

	return {
		scenes,
		selectedIndexes,
		totalFrames: cursor,
	};
};

const buildShortBgmSequence = (bgmSequence, selectedIndexes) => {
	if (!Array.isArray(bgmSequence) || bgmSequence.length === 0) {
		return [];
	}

	const mappedEntries = bgmSequence
		.map((entry) => {
			const mappedIndex = selectedIndexes.findIndex((sceneIndex) => sceneIndex >= entry.at_scene);
			if (mappedIndex === -1) {
				return null;
			}

			return {
				at_scene: mappedIndex,
				file: entry.file,
			};
		})
		.filter(Boolean);

	if (mappedEntries.length === 0) {
		return [{at_scene: 0, file: bgmSequence[0].file}];
	}

	return mappedEntries.filter((entry, index, list) => {
		if (index === 0) {
			return true;
		}

		const previous = list[index - 1];
		return previous.at_scene !== entry.at_scene || previous.file !== entry.file;
	});
};

const main = () => {
	const options = parseArgs();
	const script = readScript();
	const mode = resolveShortMode(script, options.mode);
	const source = resolveSource(script, options.from);

	if (!source) {
		throw new Error('No source scenes were found. Create a long or short script first.');
	}

	const {scenes, selectedIndexes, totalFrames} = buildShortScenes(source.scenes, mode);
	const bgmSequence = buildShortBgmSequence(source.bgmSequence, selectedIndexes);
	const explainerAudioPlan = buildExplainerAudioPlan();
	const autoBgmSequence = buildBgmSequenceForScenes({
		scenes,
		bgmAssets: explainerAudioPlan.bgmAssets,
		templateId: script.template?.id ?? 'yukkuri-explainer',
		audioDirection: explainerAudioPlan.audioDirection,
	});
	const existingShort = script.short ?? {};

	script.short = {
		...existingShort,
		config: {
			...DEFAULT_SHORT_CONFIG,
			...(existingShort.config ?? {}),
		},
		characterScale: typeof existingShort.characterScale === 'number'
			? existingShort.characterScale
			: source.characterScale ?? 1,
		generationMode: mode,
		scenes,
		bgm_sequence: bgmSequence.length > 0 ? bgmSequence : autoBgmSequence,
	};

	if (options.activate) {
		script.activeVariant = 'short';
	}

	fs.writeFileSync(SCRIPT_PATH, `${JSON.stringify(script, null, 2)}\n`, 'utf8');

	const approxSeconds = (totalFrames / ((script.short?.config?.fps ?? DEFAULT_SHORT_CONFIG.fps) || 30)).toFixed(1);
	console.log(`✅ Short script updated from ${source.kind}.`);
	console.log(`   Mode: ${mode}`);
	console.log(`   Scenes: ${scenes.length}`);
	console.log(`   Length: ${totalFrames} frames (${approxSeconds}s)`);
	console.log(`   File: ${SCRIPT_PATH}`);
	if (!options.activate) {
		console.log('   Tip: render with `npm run render:short` or switch `activeVariant` to "short".');
	}
};

main();
