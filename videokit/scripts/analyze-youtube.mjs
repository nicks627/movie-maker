/* eslint-env node */
/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
	createDeliverableContext,
	writeJsonFile,
} from './deliverable-utils.mjs';
import {
	resolveFfmpegPath,
	resolvePythonCommand,
	runCommand,
} from './gameplay-pipeline-utils.mjs';

const BRIDGE_PATH = path.join(process.cwd(), 'scripts', 'youtube_analysis_bridge.py');

const parseArgs = () => {
	const args = process.argv.slice(2);
	const urls = [];
	let sampleCount = 6;
	let deliverableDir = null;
	let projectId = null;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--url' && args[index + 1]) {
			urls.push(args[index + 1]);
			index += 1;
			continue;
		}

		if (arg.startsWith('--url=')) {
			urls.push(arg.slice('--url='.length));
			continue;
		}

		if (arg === '--sample-count' && args[index + 1]) {
			sampleCount = Number(args[index + 1]) || sampleCount;
			index += 1;
			continue;
		}

		if (arg.startsWith('--sample-count=')) {
			sampleCount = Number(arg.slice('--sample-count='.length)) || sampleCount;
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

	if (urls.length === 0) {
		throw new Error('Pass at least one --url <youtube-url>.');
	}

	return {
		urls,
		sampleCount: Math.max(3, Math.min(12, Math.floor(sampleCount))),
		deliverableDir,
		projectId,
	};
};

const getPythonCandidates = () => {
	const preferred = resolvePythonCommand();
	return [
		preferred,
		{command: 'python', prefixArgs: []},
		{command: 'py', prefixArgs: ['-3.11']},
	].filter(
		(candidate, index, list) =>
			list.findIndex(
				(other) =>
					other.command === candidate.command
					&& JSON.stringify(other.prefixArgs) === JSON.stringify(candidate.prefixArgs),
			) === index,
	);
};

const canImportBridgeDeps = (python) => {
	try {
		const result = spawnSync(
			python.command,
			[
				...python.prefixArgs,
				'-c',
				'import yt_dlp, cv2; print("ok")',
			],
			{
				encoding: 'utf8',
				env: {
					...process.env,
					PYTHONIOENCODING: 'utf-8',
					PYTHONUTF8: '1',
				},
			},
		);
		return result.status === 0;
	} catch {
		return false;
	}
};

const runYoutubeBridge = ({payload, python}) => {
	const result = spawnSync(
		python.command,
		[...python.prefixArgs, BRIDGE_PATH, JSON.stringify(payload)],
		{
			encoding: 'utf8',
			env: {
				...process.env,
				PYTHONIOENCODING: 'utf-8',
				PYTHONUTF8: '1',
			},
			maxBuffer: 1024 * 1024 * 64,
			windowsHide: true,
		},
	);
	if (result.error || result.status !== 0) {
		const detail = result.error ? String(result.error) : result.stderr || result.stdout;
		throw new Error(
			`Command failed: ${python.command} ${[...python.prefixArgs, BRIDGE_PATH].join(' ')}\n${detail}`,
		);
	}

	const stdout = String(result.stdout ?? '').trim();

	if (!stdout) {
		throw new Error('youtube_analysis_bridge.py returned empty output.');
	}

	return JSON.parse(stdout);
};
const resolveBridgePython = () => {
	const candidate = getPythonCandidates().find((item) => canImportBridgeDeps(item));
	if (!candidate) {
		throw new Error('Could not find a Python interpreter with yt_dlp and cv2 installed.');
	}
	return candidate;
};

const countValues = (values) => {
	const counts = new Map();
	values.filter(Boolean).forEach((value) => {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	});
	return [...counts.entries()].sort((left, right) => right[1] - left[1]);
};

const mostCommon = (values, fallback = 'undetermined') => countValues(values)[0]?.[0] ?? fallback;

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const summarizeRecommendations = (results) =>
	dedupe(results.flatMap((item) => item.summary?.recommendations ?? [])).slice(0, 8);

const buildCombinedSummary = ({results, urls, sampleCount}) => {
	const hookStyles = results.map((item) => item.summary?.hookStyle);
	const headlineHierarchies = results.map((item) => item.summary?.headlineHierarchy);
	const subtitleDensities = results.map((item) => item.summary?.subtitleDensity);
	const infoCardPositions = results.map((item) => item.summary?.informationCardPosition);
	const ctaTypes = results.map((item) => item.summary?.ctaType);
	const commonRecommendations = summarizeRecommendations(results);

	return {
		generatedAt: new Date().toISOString(),
		urlCount: urls.length,
		sampleCount,
		projectId: results[0]?.projectId ?? null,
		structuralConsensus: {
			hookStyle: mostCommon(hookStyles),
			headlineHierarchy: mostCommon(headlineHierarchies),
			subtitleDensity: mostCommon(subtitleDensities),
			informationCardPosition: mostCommon(infoCardPositions),
			ctaType: mostCommon(ctaTypes),
		},
		videoSummaries: results.map((item) => ({
			videoId: item.videoId,
			title: item.title,
			url: item.url,
			hookStyle: item.summary?.hookStyle ?? null,
			headlineHierarchy: item.summary?.headlineHierarchy ?? null,
			subtitleDensity: item.summary?.subtitleDensity ?? null,
			informationCardPosition: item.summary?.informationCardPosition ?? null,
			ctaType: item.summary?.ctaType ?? null,
			recommendations: item.summary?.recommendations ?? [],
			warnings: item.warnings ?? [],
		})),
		recommendations: commonRecommendations,
	};
};

const toMarkdown = (summary) => {
	const lines = [
		'# YouTube Analysis Summary',
		'',
		`- Generated at: ${summary.generatedAt}`,
		`- Videos analyzed: ${summary.urlCount}`,
		`- Samples per video: ${summary.sampleCount}`,
		'',
		'## Consensus',
		'',
		`- Hook style: ${summary.structuralConsensus.hookStyle}`,
		`- Headline hierarchy: ${summary.structuralConsensus.headlineHierarchy}`,
		`- Subtitle density: ${summary.structuralConsensus.subtitleDensity}`,
		`- Information card position: ${summary.structuralConsensus.informationCardPosition}`,
		`- CTA type: ${summary.structuralConsensus.ctaType}`,
		'',
		'## Carry Into Future Explainers',
		'',
	];

	if (summary.recommendations.length === 0) {
		lines.push('- No shared recommendation was extracted.');
	} else {
		summary.recommendations.forEach((item) => lines.push(`- ${item}`));
	}

	lines.push('', '## Per Video', '');
	summary.videoSummaries.forEach((item) => {
		lines.push(`### ${item.videoId}`);
		lines.push('');
		lines.push(`- Title: ${item.title}`);
		lines.push(`- Hook style: ${item.hookStyle ?? 'n/a'}`);
		lines.push(`- Headline hierarchy: ${item.headlineHierarchy ?? 'n/a'}`);
		lines.push(`- Subtitle density: ${item.subtitleDensity ?? 'n/a'}`);
		lines.push(`- Information card position: ${item.informationCardPosition ?? 'n/a'}`);
		lines.push(`- CTA type: ${item.ctaType ?? 'n/a'}`);
		if ((item.recommendations ?? []).length > 0) {
			item.recommendations.forEach((recommendation) => lines.push(`- Rec: ${recommendation}`));
		}
		if ((item.warnings ?? []).length > 0) {
			item.warnings.forEach((warning) => lines.push(`- Warning: ${warning}`));
		}
		lines.push('');
	});

	return `${lines.join('\n').trim()}\n`;
};

const main = () => {
	const options = parseArgs();
	const deliverableContext = createDeliverableContext({
		projectId: options.projectId,
		deliverableDir: options.deliverableDir,
		snapshotScript: true,
	});
	const bridgePython = resolveBridgePython();
	let ffmpegPath = null;

	try {
		ffmpegPath = resolveFfmpegPath();
	} catch (error) {
		console.warn(`⚠️  ffmpeg could not be resolved: ${error.message}`);
	}

	const runManifest = {
		generatedAt: new Date().toISOString(),
		urls: options.urls,
		sampleCount: options.sampleCount,
		projectId: deliverableContext.paths.projectId,
	};
	writeJsonFile(
		path.join(deliverableContext.paths.youtubeAnalysisDir, 'requested-urls.json'),
		runManifest,
	);

	const results = options.urls.map((url, index) => {
		console.log(`\n=== Analyze YouTube ${index + 1}/${options.urls.length} ===`);
		const bridgeResult = runYoutubeBridge({
			payload: {
				url,
				sampleCount: options.sampleCount,
				outputDir: deliverableContext.paths.youtubeAnalysisDir,
				ffmpegPath,
			},
			python: bridgePython,
		});

		if (bridgeResult.ok === false) {
			throw new Error(bridgeResult.error || `Failed to analyze ${url}`);
		}

		console.log(`✅ ${bridgeResult.videoId} analyzed: ${bridgeResult.outputDir}`);
		return {
			...bridgeResult,
			projectId: deliverableContext.paths.projectId,
		};
	});

	const combinedSummary = buildCombinedSummary({
		results,
		urls: options.urls,
		sampleCount: options.sampleCount,
	});

	const summaryJsonPath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'analysis-summary.json');
	const summaryMdPath = path.join(deliverableContext.paths.youtubeAnalysisDir, 'analysis-summary.md');
	writeJsonFile(summaryJsonPath, combinedSummary);
	fs.writeFileSync(summaryMdPath, toMarkdown(combinedSummary), 'utf8');

	console.log(`\nWrote ${summaryJsonPath}`);
	console.log(`Wrote ${summaryMdPath}`);
	console.log(`Project root: ${deliverableContext.paths.root}`);
};

main();
