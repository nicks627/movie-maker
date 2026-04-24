/* eslint-env node */
/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import {createDeliverableContext, writeJsonFile} from './deliverable-utils.mjs';

const PROJECT_ROOT = process.cwd();
const SCRIPT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'script.json');

const TEMPLATE_CONFIG = {
	explainer: {
		templateId: 'yukkuri-explainer',
		defaultTitle: '参考動画から作る解説動画',
	},
	political: {
		templateId: 'yukkuri-explainer',
		defaultTitle: '参考動画から作る政治系動画',
	},
	gameplay: {
		templateId: 'game-play-commentary',
		defaultTitle: '参考動画から作るゲーム実況動画',
	},
	'line-chat': {
		templateId: 'line-chat',
		defaultTitle: '参考動画から作るLINEチャット動画',
	},
	generic: {
		templateId: 'yukkuri-explainer',
		defaultTitle: '参考動画から作る動画',
	},
};

const parseArgs = () => {
	const args = process.argv.slice(2);
	const parsed = {
		template: '',
		projectId: '',
		title: '',
		output: null,
		force: false,
		syncScriptJson: false,
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--template' && args[index + 1]) {
			parsed.template = args[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--template=')) {
			parsed.template = arg.slice('--template='.length);
			continue;
		}
		if (arg === '--project-id' && args[index + 1]) {
			parsed.projectId = args[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--project-id=')) {
			parsed.projectId = arg.slice('--project-id='.length);
			continue;
		}
		if (arg === '--title' && args[index + 1]) {
			parsed.title = args[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--title=')) {
			parsed.title = arg.slice('--title='.length);
			continue;
		}
		if (arg === '--output' && args[index + 1]) {
			parsed.output = path.resolve(PROJECT_ROOT, args[index + 1]);
			index += 1;
			continue;
		}
		if (arg.startsWith('--output=')) {
			parsed.output = path.resolve(PROJECT_ROOT, arg.slice('--output='.length));
			continue;
		}
		if (arg === '--force') {
			parsed.force = true;
			continue;
		}
		if (arg === '--sync-script-json') {
			parsed.syncScriptJson = true;
		}
	}

	if (!parsed.template || !TEMPLATE_CONFIG[parsed.template]) {
		throw new Error('Pass --template <explainer|gameplay|line-chat|political|generic>.');
	}

	if (!parsed.projectId) {
		throw new Error('Pass --project-id <slug>.');
	}

	return parsed;
};

const ensureDir = (targetPath) => {
	fs.mkdirSync(targetPath, {recursive: true});
};

const writeUtf8 = (targetPath, content, {force = true} = {}) => {
	if (fs.existsSync(targetPath) && !force) {
		throw new Error(`File already exists: ${targetPath}\nUse --force to overwrite.`);
	}
	ensureDir(path.dirname(targetPath));
	fs.writeFileSync(targetPath, content, 'utf8');
};

const pickAnalysisSummary = (youtubeAnalysisDir) => {
	const candidates = [
		{
			kind: 'brief',
			path: path.join(youtubeAnalysisDir, 'codex-analysis-brief.json'),
		},
		{
			kind: 'summary',
			path: path.join(youtubeAnalysisDir, 'comparison', 'comparison-summary.json'),
		},
		{
			kind: 'summary',
			path: path.join(youtubeAnalysisDir, 'analysis-summary.json'),
		},
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate.path)) {
			return {
				...candidate,
				data: JSON.parse(fs.readFileSync(candidate.path, 'utf8')),
			};
		}
	}

	throw new Error(`No analysis summary found in ${youtubeAnalysisDir}`);
};

const deriveBriefFromSummary = ({summary, template, projectId, title}) => {
	const fallbackTitle =
		title
		|| summary?.title
		|| summary?.projectTitle
		|| summary?.videoSummaries?.[0]?.title
		|| TEMPLATE_CONFIG[template].defaultTitle;
	const hookStyle = summary?.structuralConsensus?.hookStyle ?? summary?.hookStyle ?? 'headline-led';
	const ctaType = summary?.structuralConsensus?.ctaType ?? summary?.ctaType ?? 'assertive takeaway';
	const popupZone = summary?.structuralConsensus?.suggestedPopupZone ?? summary?.suggestedPopupZone ?? 'full';
	const narrationDensity = summary?.structuralConsensus?.narrationDensity ?? summary?.narrationDensity ?? 'medium';
	const voiceMixStyle = summary?.structuralConsensus?.voiceMixStyle ?? summary?.voiceMixStyle ?? 'voice-punctuated';
	const bgmRoleSuggestion =
		summary?.structuralConsensus?.bgmRoleSuggestion ?? summary?.bgmRoleSuggestion ?? 'steady documentary bed';
	const seUsageStyle =
		summary?.structuralConsensus?.seUsageStyle ?? summary?.seUsageStyle ?? 'restrained punctuation';
	const sourceVideos = summary?.videoSummaries ?? [];
	const recommendations = summary?.recommendations ?? [];
	const primaryVideo = sourceVideos[0] ?? {};
	const hookText =
		primaryVideo.hookText
		?? summary?.hookText
		?? `${fallbackTitle} の核心を最初に置く。`;
	const ctaText =
		primaryVideo.ctaText
		?? summary?.ctaText
		?? '最後は視聴者に論点を持ち帰らせる。';

	return {
		generatedAt: new Date().toISOString(),
		projectId,
		template,
		title: fallbackTitle,
		structuralConsensus: {
			hookStyle,
			ctaType,
			suggestedPopupZone: popupZone,
			narrationDensity,
			voiceMixStyle,
			bgmRoleSuggestion,
			seUsageStyle,
			headlineHierarchy: summary?.structuralConsensus?.headlineHierarchy ?? summary?.headlineHierarchy ?? 'two-line headline',
			subtitleDensity: summary?.structuralConsensus?.subtitleDensity ?? summary?.subtitleDensity ?? 'medium',
		},
		sourceVideos: sourceVideos.map((item) => ({
			videoId: item.videoId ?? null,
			title: item.title ?? null,
			url: item.url ?? null,
			recommendations: item.recommendations ?? [],
		})),
		recommendations,
		hookText,
		ctaText,
		corePoints: recommendations.slice(0, 4),
	};
};

const normalizeExistingBrief = ({brief, template, projectId, title}) => {
	const fallbackTitle =
		title
		|| brief?.title
		|| brief?.sourceVideos?.[0]?.title
		|| TEMPLATE_CONFIG[template].defaultTitle;
	const recommendations = Array.isArray(brief?.recommendations) ? brief.recommendations : [];
	const corePoints = Array.isArray(brief?.corePoints) && brief.corePoints.length > 0
		? brief.corePoints
		: recommendations.slice(0, 4);

	return {
		generatedAt: new Date().toISOString(),
		projectId,
		template,
		title: fallbackTitle,
		structuralConsensus: {
			hookStyle: brief?.structuralConsensus?.hookStyle ?? 'headline-led',
			ctaType: brief?.structuralConsensus?.ctaType ?? 'assertive takeaway',
			suggestedPopupZone: brief?.structuralConsensus?.suggestedPopupZone ?? 'full',
			narrationDensity: brief?.structuralConsensus?.narrationDensity ?? 'medium',
			voiceMixStyle: brief?.structuralConsensus?.voiceMixStyle ?? 'voice-punctuated',
			bgmRoleSuggestion: brief?.structuralConsensus?.bgmRoleSuggestion ?? 'steady documentary bed',
			seUsageStyle: brief?.structuralConsensus?.seUsageStyle ?? 'restrained punctuation',
			headlineHierarchy: brief?.structuralConsensus?.headlineHierarchy ?? 'two-line headline',
			subtitleDensity: brief?.structuralConsensus?.subtitleDensity ?? 'medium',
		},
		sourceVideos: Array.isArray(brief?.sourceVideos) ? brief.sourceVideos : [],
		recommendations,
		hookText: brief?.hookText ?? `${fallbackTitle} の核心を最初に置く。`,
		ctaText: brief?.ctaText ?? '最後は視聴者に論点を持ち帰らせる。',
		corePoints,
	};
};

const buildBriefFromAnalysis = ({analysisRecord, template, projectId, title}) => {
	if (analysisRecord.kind === 'brief') {
		return normalizeExistingBrief({
			brief: analysisRecord.data,
			template,
			projectId,
			title,
		});
	}

	return deriveBriefFromSummary({
		summary: analysisRecord.data,
		template,
		projectId,
		title,
	});
};

const buildLayoutContract = ({brief, template}) => {
	const longSubtitle = template === 'gameplay'
		? {widthPct: 78, heightPct: 18, bottomPct: 5.5}
		: {widthPct: 66, heightPct: 14, bottomPct: 4};
	const shortSubtitle = template === 'line-chat'
		? {widthPct: 88, heightPct: 14, bottomPct: 4.2}
		: {widthPct: 84, heightPct: 12, bottomPct: 5};

	return {
		generatedAt: new Date().toISOString(),
		template,
		recommendedVisualMode:
			template === 'political'
				? 'backgroundFocus'
				: template === 'gameplay'
					? 'split'
					: 'popupFocus',
		suggestedPopupZone: brief.structuralConsensus.suggestedPopupZone,
		subtitle: {
			long: longSubtitle,
			short: shortSubtitle,
		},
		notes: [
			'subtitle は popup と競合させない',
			'background は情報理解に寄与するものを優先する',
			template === 'gameplay'
				? 'HUD と lower-third の重なりに注意する'
				: 'popup は読み終わる前に切らない',
		],
	};
};

const buildAudioDirectionDraft = ({brief, template}) => {
	const baseRoles = {
		explainer: ['hook-tech', 'calm-explainer', 'victory-resolve'],
		political: ['corporate-tension', 'calm-explainer', 'victory-resolve'],
		gameplay: ['battle-tension', 'comedy-light', 'victory-resolve'],
		'line-chat': ['chat-emotion', 'none'],
		generic: ['calm-explainer', 'comedy-light'],
	};

	return {
		generatedAt: new Date().toISOString(),
		template,
		narrationDensity: brief.structuralConsensus.narrationDensity,
		voiceMixStyle: brief.structuralConsensus.voiceMixStyle,
		bgmRoleSuggestion: brief.structuralConsensus.bgmRoleSuggestion,
		seUsageStyle: brief.structuralConsensus.seUsageStyle,
		recommendedBgmRoles: baseRoles[template] ?? baseRoles.generic,
		sePolicy:
			brief.structuralConsensus.seUsageStyle === 'frequent impact hits'
				? 'impact 系 SE は使いすぎ注意。節目だけに減らして可読性を守る'
				: template === 'line-chat'
				? 'message-pop 中心で、impact は reveal のみ'
				: template === 'gameplay'
					? 'victory / clutch / failure の節目だけ強め'
					: 'hook と reveal だけ強く、数字説明は静かめ',
		silencePolicy:
			brief.structuralConsensus.voiceMixStyle === 'delayed-voice-entry'
				? '冒頭 1 beat の無音を許す'
				: '重要数字や結論前だけ短い無音を使う',
	};
};

const buildScriptOutline = ({brief, template}) => ({
	generatedAt: new Date().toISOString(),
	template,
	title: brief.title,
	hookText: brief.hookText,
	ctaText: brief.ctaText,
	corePoints: brief.corePoints.length > 0 ? brief.corePoints : [
		'参考動画の hook を自分の論点に翻訳する',
		'中盤で一度、構造を図解する',
		'最後は CTA を短く締める',
	],
	recommendations: brief.recommendations,
});

const buildCodexAnalysisReport = ({brief, layoutContract, audioDraft}) => {
	const lines = [
		'# Codex Analysis Report',
		'',
		`- Template: ${brief.template}`,
		`- Title: ${brief.title}`,
		`- Hook style: ${brief.structuralConsensus.hookStyle}`,
		`- CTA type: ${brief.structuralConsensus.ctaType}`,
		`- Suggested popup zone: ${layoutContract.suggestedPopupZone}`,
		`- Narration density: ${audioDraft.narrationDensity}`,
		`- Voice mix style: ${audioDraft.voiceMixStyle}`,
		`- BGM role suggestion: ${audioDraft.bgmRoleSuggestion}`,
		`- SE usage style: ${audioDraft.seUsageStyle}`,
		'',
		'## Core Points',
		'',
	];

	(brief.corePoints ?? []).forEach((point) => {
		lines.push(`- ${point}`);
	});

	lines.push('', '## Recommendations', '');
	(brief.recommendations ?? []).forEach((item) => {
		lines.push(`- ${item}`);
	});

	return `${lines.join('\n').trim()}\n`;
};

const buildMetadataMarkdown = ({brief, template}) => {
	const tags = [
		template,
		brief.structuralConsensus.hookStyle,
		brief.structuralConsensus.ctaType,
		brief.structuralConsensus.narrationDensity,
	].filter(Boolean);

	return `# YouTube Metadata

## Search axes

- ${brief.title}
- ${brief.structuralConsensus.hookStyle}
- ${brief.structuralConsensus.ctaType}
- ${brief.structuralConsensus.narrationDensity}

## Recommended title

${brief.title}

## Alternate titles

- ${brief.title} を3分で整理
- ${brief.title} の見方

## Description

参考動画分析をもとに、${brief.title} の論点を整理します。  
hook の強さ、字幕密度、popup の置き方、音の役割を再設計して、見やすくまとめます。

## Tags

${tags.join(', ')}

## Pinned comment idea

このテーマで、あなたがいちばん重要だと思う論点をコメントで教えてください。
`;
};

const buildThumbnailMarkdown = ({brief, template}) => `# Thumbnail Prompt

## Recommended overlay text

- ${brief.title}

## Alternate overlay text

- ${brief.structuralConsensus.hookStyle}
- ${template === 'political' ? '争点はここ' : '結論はこれ'}

## Prompt

Create a bold YouTube thumbnail for a ${template} video. Use a clear focal subject, strong contrast, a readable central headline area, and leave room for short Japanese overlay text. Emphasize ${brief.structuralConsensus.hookStyle} energy and ${brief.structuralConsensus.ctaType} payoff.

## Negative prompt

No cluttered collage, no tiny unreadable text, no muddy colors, no low-contrast composition.

## Color direction

- primary: high contrast
- secondary: editorial documentary look
- accent: red or cyan for emphasis
`;

const makeExplainerScene = ({id, speaker, sceneRole, text, startTime, duration, short = false, popup = null}) => ({
	id,
	speaker,
	sceneRole,
	text,
	speechText: text,
	subtitleText: text,
	startTime,
	duration,
	speedScale: short ? 1.24 : 1.12,
	sceneVisualMode: popup ? 'popupFocus' : 'backgroundFocus',
	popupZone: popup?.popupZone ?? (short ? 'upperBand' : 'middleBand'),
	popups: popup ? [popup] : [],
});

const buildExplainerScript = ({brief, projectId, template}) => {
	const isPolitical = template === 'political';
	const popupAccent = isPolitical ? '#ef4444' : '#38bdf8';
	const hookPopup = isPolitical
		? {
			component: 'PoliticalShockBanner',
			props: {
				kicker: '参考動画分析',
				headline: brief.title,
				subline: brief.structuralConsensus.hookStyle,
				accentColor: popupAccent,
			},
			imageX: 50,
			imageY: 74,
			imageWidth: 92,
			imageHeight: 23,
			duration: 180,
			popupZone: 'upperBand',
		}
		: {
			component: 'StatsCard',
			props: {
				title: 'Reference pattern',
				stats: [
					{
						icon: 'H',
						label: 'Hook',
						value: brief.structuralConsensus.hookStyle,
						color: '#38bdf8',
					},
					{
						icon: 'C',
						label: 'CTA',
						value: brief.structuralConsensus.ctaType,
						color: '#ef4444',
					},
				],
			},
			imageX: 50,
			imageY: 62,
			imageWidth: 90,
			imageHeight: 28,
			duration: 200,
			popupZone: 'middleBand',
		};

	const bodyPoints = brief.corePoints.slice(0, 3);
	const longScenes = [
		makeExplainerScene({
			id: `${projectId}_long_00_hook`,
			speaker: 'metan',
			sceneRole: 'hook',
			text: brief.hookText,
			startTime: 0,
			duration: 220,
			popup: hookPopup,
		}),
		makeExplainerScene({
			id: `${projectId}_long_01_point`,
			speaker: 'zundamon',
			sceneRole: 'explanation',
			text: bodyPoints[0] ?? '参考動画の core point をここに要約します。',
			startTime: 230,
			duration: 210,
		}),
		makeExplainerScene({
			id: `${projectId}_long_02_structure`,
			speaker: 'metan',
			sceneRole: 'comparison',
			text: bodyPoints[1] ?? '中盤で一度、構造と因果を整理します。',
			startTime: 450,
			duration: 210,
		}),
		makeExplainerScene({
			id: `${projectId}_long_03_takeaway`,
			speaker: 'zundamon',
			sceneRole: 'summary',
			text: bodyPoints[2] ?? '最後に視聴者が持ち帰るべきポイントを短くまとめます。',
			startTime: 670,
			duration: 210,
		}),
		makeExplainerScene({
			id: `${projectId}_long_04_cta`,
			speaker: 'metan',
			sceneRole: 'cta',
			text: brief.ctaText,
			startTime: 890,
			duration: 180,
			short: true,
		}),
	];

	const shortScenes = [
		makeExplainerScene({
			id: `${projectId}_short_00_hook`,
			speaker: 'metan',
			sceneRole: 'hook',
			text: brief.hookText,
			startTime: 0,
			duration: 150,
			short: true,
			popup: {
				...hookPopup,
				imageY: isPolitical ? 82 : 70,
				imageWidth: 94,
				imageHeight: isPolitical ? 26 : 30,
				duration: 150,
			},
		}),
		makeExplainerScene({
			id: `${projectId}_short_01_core`,
			speaker: 'zundamon',
			sceneRole: 'summary',
			text: bodyPoints[0] ?? '要点を一つに絞って短く見せます。',
			startTime: 160,
			duration: 140,
			short: true,
		}),
		makeExplainerScene({
			id: `${projectId}_short_02_cta`,
			speaker: 'metan',
			sceneRole: 'cta',
			text: brief.ctaText,
			startTime: 310,
			duration: 140,
			short: true,
		}),
	];

	return {
		project: {
			id: projectId,
			title: brief.title,
			version: 1,
			defaultVariant: 'long',
			category: template,
		},
		template: {
			id: 'yukkuri-explainer',
		},
		audio: {
			bgmVolume: 0.08,
			voiceVolume: 1.2,
			seVolume: 0.8,
			voiceDucking: 0.58,
			duckFadeFrames: 12,
			masterVolume: 1,
		},
		activeVariant: 'long',
		long: {
			config: {
				width: 1920,
				height: 1080,
				fps: 30,
			},
			bgm_sequence: [],
			scenes: longScenes,
		},
		short: {
			config: {
				width: 1080,
				height: 1920,
				fps: 30,
			},
			bgm_sequence: [],
			scenes: shortScenes.map((scene) => ({
				...scene,
				subtitleY: 5,
				subtitleWidth: 84,
				subtitleHeight: 12,
			})),
		},
	};
};

const buildGameplayScript = ({brief, projectId}) => {
	const corePoints = brief.corePoints.length > 0 ? brief.corePoints : [
		'開幕で今回の見どころを置く',
		'中盤で一度、判断ポイントを整理する',
		'最後に勝ち筋を短く回収する',
	];

	return {
		project: {
			id: projectId,
			title: brief.title,
			version: 2,
			defaultVariant: 'long',
		},
		template: {
			id: 'game-play-commentary',
		},
		output: {
			preset: 'landscape-fhd',
			fps: 30,
		},
		audio: {
			bgmVolume: 0.12,
			voiceVolume: 1,
			seVolume: 0.78,
			voiceDucking: 0.5,
			duckFadeFrames: 10,
			masterVolume: 1,
		},
		timeline: {
			bgm: [],
			gameplay: {
				title: brief.title,
				series: 'Analysis Starter',
				video: 'assets/video/sample_gameplay.mp4',
				streamerName: '四国めたん',
				streamerHandle: '@analysis_starter',
				accentColor: '#22c55e',
				secondaryColor: '#0f172a',
				playGameplayAudio: false,
				displayMode: 'broadcast',
				showHud: true,
				showCommentatorAvatar: true,
				showProgress: true,
				showTimer: true,
				segments: corePoints.map((point, index) => ({
					id: `${projectId}_segment_${index}`,
					chapter: ['OPENING', 'MID', 'PAYOFF'][index] ?? `STEP ${index + 1}`,
					title: point.slice(0, 18),
					speaker: index % 2 === 0 ? 'metan' : 'zundamon',
					text: point,
					speechText: point,
					subtitleBeats: [point],
					startTime: index * 180,
					duration: 165,
					trimBefore: index * 180,
					sourceDuration: 165,
					voiceFile: `${projectId}_segment_${index}.wav`,
					emphasis: index === corePoints.length - 1 ? 'victory' : index === 0 ? 'hype' : 'normal',
					sceneRole: index === corePoints.length - 1 ? 'victory' : index === 0 ? 'escalation' : 'context',
					draftLayer: index % 2 === 0 ? 'explanation' : 'banter',
				})),
			},
		},
	};
};

const buildLineChatScript = ({brief, projectId}) => {
	const corePoints = brief.corePoints.length > 0 ? brief.corePoints : [
		'最初の一言で tension を作る',
		'中盤で違和感を見せる',
		'最後にオチを置く',
	];

	return {
		project: {
			id: projectId,
			title: brief.title,
			version: 1,
		},
		template: {
			id: 'line-chat',
		},
		output: {
			preset: 'portrait-fhd',
		},
		timeline: {
			chat: {
				mode: 'dm',
				roomName: '参考動画アレンジ',
				myName: '私',
				partnerName: '相手',
				partnerColor: '#38BDF8',
				bgColor: '#B2DFDB',
				messages: [
					{
						id: `${projectId}_msg_0`,
						sender: 'me',
						text: brief.hookText,
						revealFrame: 0,
						duration: 100,
						readReceipt: '既読',
						timestamp: '21:34',
					},
					{
						id: `${projectId}_msg_1`,
						sender: '相手',
						text: corePoints[0],
						revealFrame: 120,
						duration: 96,
						typingFrames: 36,
						timestamp: '21:35',
					},
					{
						id: `${projectId}_msg_2`,
						sender: 'me',
						text: corePoints[1] ?? 'ここで会話を反転させます。',
						revealFrame: 240,
						duration: 96,
						timestamp: '21:36',
					},
					{
						id: `${projectId}_msg_3`,
						sender: '相手',
						text: brief.ctaText,
						revealFrame: 360,
						duration: 110,
						typingFrames: 42,
						timestamp: '21:37',
						reaction: '👀',
					},
				],
			},
		},
	};
};

const buildScriptFromBrief = ({brief, template, projectId}) => {
	if (template === 'gameplay') {
		return buildGameplayScript({brief, projectId});
	}
	if (template === 'line-chat') {
		return buildLineChatScript({brief, projectId});
	}
	return buildExplainerScript({brief, projectId, template});
};

const main = () => {
	const args = parseArgs();
	const deliverableContext = createDeliverableContext({
		projectId: args.projectId,
		snapshotScript: false,
		seedPublishFromLegacy: false,
	});
	const analysisRecord = pickAnalysisSummary(
		deliverableContext.paths.youtubeAnalysisDir,
	);
	const brief = buildBriefFromAnalysis({
		analysisRecord,
		template: args.template,
		projectId: args.projectId,
		title: args.title?.trim() || '',
	});
	const layoutContract = buildLayoutContract({brief, template: args.template});
	const audioDraft = buildAudioDirectionDraft({brief, template: args.template});
	const scriptOutline = buildScriptOutline({brief, template: args.template});
	const reportMarkdown = buildCodexAnalysisReport({brief, layoutContract, audioDraft});
	const generatedScript = buildScriptFromBrief({
		brief,
		template: args.template,
		projectId: args.projectId,
	});

	const codexBriefPath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'codex-analysis-brief.json');
	const codexReportPath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'codex-analysis-report.md');
	const layoutContractPath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'layout-contract.json');
	const audioDraftPath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'audio-direction-draft.json');
	const scriptOutlinePath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'script-outline.json');
	const outputPath = args.output ?? path.join(deliverableContext.paths.sourceDir, 'analysis-generated-script.json');

	writeJsonFile(codexBriefPath, brief);
	writeUtf8(codexReportPath, reportMarkdown);
	writeJsonFile(layoutContractPath, layoutContract);
	writeJsonFile(audioDraftPath, audioDraft);
	writeJsonFile(scriptOutlinePath, scriptOutline);
	writeUtf8(outputPath, `${JSON.stringify(generatedScript, null, 2)}\n`, {force: args.force});
	writeUtf8(
		deliverableContext.paths.publishMetadataPath,
		buildMetadataMarkdown({brief, template: args.template}),
	);
	writeUtf8(
		deliverableContext.paths.publishThumbnailPath,
		buildThumbnailMarkdown({brief, template: args.template}),
	);
	writeUtf8(
		deliverableContext.paths.scriptSnapshotPath,
		`${JSON.stringify(generatedScript, null, 2)}\n`,
	);

	if (args.syncScriptJson) {
		writeUtf8(SCRIPT_OUTPUT_PATH, `${JSON.stringify(generatedScript, null, 2)}\n`, {force: true});
	}

	console.log(
		JSON.stringify(
			{
				projectId: args.projectId,
				template: args.template,
				title: brief.title,
				analysisSource: analysisRecord.path,
				codexBrief: codexBriefPath,
				codexReport: codexReportPath,
				layoutContract: layoutContractPath,
				audioDraft: audioDraftPath,
				scriptOutline: scriptOutlinePath,
				output: outputPath,
				metadata: deliverableContext.paths.publishMetadataPath,
				thumbnail: deliverableContext.paths.publishThumbnailPath,
				snapshot: deliverableContext.paths.scriptSnapshotPath,
				syncedScriptJson: args.syncScriptJson ? SCRIPT_OUTPUT_PATH : null,
			},
			null,
			2,
		),
	);
};

try {
	main();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
