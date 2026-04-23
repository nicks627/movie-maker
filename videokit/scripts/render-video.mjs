import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';
import path from 'path';
import {createDeliverableContext} from './deliverable-utils.mjs';

const VARIANT_TO_COMPOSITION = {
	current: 'YukkuriVideo',
	long: 'YukkuriVideoLong',
	short: 'YukkuriVideoShort',
};

const VARIANT_TO_OUTPUT = {
	current: 'out.mp4',
	long: 'out-long.mp4',
	short: 'out-short.mp4',
};

const VALID_VARIANTS = ['current', 'long', 'short', 'both'];

const parseArgs = () => {
	const args = process.argv.slice(2);
	let variant = 'current';
	let output = null;
	let concurrency = 2;
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
		if (arg === '--output' && args[index + 1]) {
			output = args[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--output=')) {
			output = arg.slice('--output='.length);
			continue;
		}
		if (arg === '--concurrency' && args[index + 1]) {
			concurrency = Number(args[index + 1]) || concurrency;
			index += 1;
			continue;
		}
		if (arg.startsWith('--concurrency=')) {
			concurrency = Number(arg.slice('--concurrency='.length)) || concurrency;
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

	if (!VALID_VARIANTS.includes(variant)) {
		throw new Error(`Unsupported variant "${variant}". Use one of: ${VALID_VARIANTS.join(', ')}`);
	}

	if (variant === 'both' && output) {
		throw new Error('--output cannot be combined with --variant both. Use the default file names or run each variant separately.');
	}

	return {
		variant,
		output,
		concurrency: Math.max(1, Math.floor(concurrency)),
		deliverableDir,
		projectId,
	};
};

const getTargets = ({variant, output, deliverablePaths}) => {
	if (variant === 'both') {
		return [
			{
				variant: 'long',
				compositionId: VARIANT_TO_COMPOSITION.long,
				outputLocation: path.resolve(deliverablePaths.renderOutputs.long),
			},
			{
				variant: 'short',
				compositionId: VARIANT_TO_COMPOSITION.short,
				outputLocation: path.resolve(deliverablePaths.renderOutputs.short),
			},
		];
	}

	return [
		{
			variant,
			compositionId: VARIANT_TO_COMPOSITION[variant],
			outputLocation: path.resolve(output ?? deliverablePaths.renderOutputs[variant]),
		},
	];
};

const renderTarget = async ({bundleLocation, compositionId, outputLocation, variant, concurrency}) => {
	const composition = await selectComposition({
		id: compositionId,
		serveUrl: bundleLocation,
	});

	console.log(`🎬 Rendering ${variant}...`);
	let lastLoggedPercent = -1;
	await renderMedia({
		composition,
		serveUrl: bundleLocation,
		outputLocation,
		codec: 'h264',
		concurrency,
		onProgress: ({progress}) => {
			const wholePercent = Math.floor(progress * 100);
			if (wholePercent !== lastLoggedPercent) {
				lastLoggedPercent = wholePercent;
				console.log(`[${variant}] ${wholePercent}%`);
			}
		},
	});

	console.log(`✅ ${variant} render complete: ${outputLocation}`);
};

const render = async () => {
	const options = parseArgs();
	const deliverableContext = createDeliverableContext({
		projectId: options.projectId,
		deliverableDir: options.deliverableDir,
		seedPublishFromLegacy: true,
		snapshotScript: true,
	});
	const targets = getTargets({
		...options,
		deliverablePaths: deliverableContext.paths,
	});
	const entry = path.resolve('src/index.ts');

	if (deliverableContext.projectWarnings.length > 0) {
		deliverableContext.projectWarnings.forEach((warning) => console.warn(`⚠️  ${warning}`));
	}
	if (deliverableContext.seededPublishFiles.length > 0) {
		deliverableContext.seededPublishFiles.forEach((item) => {
			console.log(`📦 Seeded ${item.type} from legacy root: ${item.to}`);
		});
	}

	for (const target of targets) {
		console.log(`🧪 Running preflight review for ${target.variant}...`);
		const reviewArgs = [
			path.resolve('scripts/review-preflight.mjs'),
			'--variant',
			target.variant,
			'--deliverable-dir',
			deliverableContext.paths.root,
			'--project-id',
			deliverableContext.paths.projectId,
		];
		const reviewResult = spawnSync(
			process.execPath,
			reviewArgs,
			{cwd: process.cwd(), stdio: 'inherit'},
		);

		if (typeof reviewResult.status === 'number' && reviewResult.status !== 0) {
			throw new Error(`Preflight review failed for ${target.variant}. Fix the review issues before rendering.`);
		}
	}

	console.log('📦 Bundling project...');
	const bundleLocation = await bundle({
		entryPoint: entry,
	});

	for (const target of targets) {
		await renderTarget({
			bundleLocation,
			compositionId: target.compositionId,
			outputLocation: target.outputLocation,
			variant: target.variant,
			concurrency: options.concurrency,
		});
	}
};

render().catch((err) => {
	console.error('❌ Render failed:', err);
	process.exit(1);
});
