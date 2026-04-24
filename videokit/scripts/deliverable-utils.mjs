import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_ROOT = process.cwd();
export const SCRIPT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'script.json');
export const LEGACY_METADATA_PATH = path.join(PROJECT_ROOT, 'youtube_metadata.md');
export const LEGACY_THUMBNAIL_PATH = path.join(PROJECT_ROOT, 'thumbnail_prompt.md');
export const PROJECTS_ROOT_DIRNAME = 'projects';

export const DEFAULT_RENDER_OUTPUTS = {
	current: 'out.mp4',
	long: 'out-long.mp4',
	short: 'out-short.mp4',
};

export const REVIEW_REPORT_FILENAMES = {
	textAudio: 'script-text-audio-review.generated.json',
	audioBalance: 'script-audio-balance-review.generated.json',
	rhythmVisual: 'script-rhythm-visual-review.generated.json',
	layout: 'script-layout-review.generated.json',
	publish: 'script-publish-review.generated.json',
};

export const DELIVERABLE_SUBDIRS = [
	'publish',
	'renders',
	'review',
	path.join('analysis', 'youtube'),
	'logs',
	'source',
	'manifests',
];

export const sanitizeSlug = (value) =>
	String(value ?? '')
		.normalize('NFKC')
		.toLowerCase()
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);

export const ensureDir = (dirPath) => {
	fs.mkdirSync(dirPath, {recursive: true});
};

export const readScriptJson = () => JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));

export const resolveProjectIdentity = (script, {projectId} = {}) => {
	const title = script?.project?.title?.trim() || 'Untitled Project';
	const requestedId = projectId?.trim() || script?.project?.id?.trim() || title;
	const id = sanitizeSlug(requestedId) || 'untitled-project';
	const warnings = [];

	if (!script?.project?.id && !projectId) {
		warnings.push(
			`project.id が未設定だったため、project slug として "${id}" を補完しました。`,
		);
	}

	return {
		id,
		title,
		warnings,
	};
};

export const getDeliverablePaths = ({script, projectId, deliverableDir} = {}) => {
	const activeScript = script ?? readScriptJson();
	const identity = resolveProjectIdentity(activeScript, {projectId});
	const root = path.resolve(deliverableDir ?? path.join(PROJECT_ROOT, PROJECTS_ROOT_DIRNAME, identity.id));

	return {
		projectId: identity.id,
		projectTitle: identity.title,
		projectWarnings: identity.warnings,
		root,
		publishDir: path.join(root, 'publish'),
		rendersDir: path.join(root, 'renders'),
		reviewDir: path.join(root, 'review'),
		analysisDir: path.join(root, 'analysis'),
		youtubeAnalysisDir: path.join(root, 'analysis', 'youtube'),
		logsDir: path.join(root, 'logs'),
		sourceDir: path.join(root, 'source'),
		manifestsDir: path.join(root, 'manifests'),
		publishMetadataPath: path.join(root, 'publish', 'youtube_metadata.md'),
		publishThumbnailPath: path.join(root, 'publish', 'thumbnail_prompt.md'),
		legacyMetadataPath: LEGACY_METADATA_PATH,
		legacyThumbnailPath: LEGACY_THUMBNAIL_PATH,
		scriptSnapshotPath: path.join(root, 'source', 'script.snapshot.json'),
		reviewReportPaths: {
			textAudio: path.join(root, 'review', REVIEW_REPORT_FILENAMES.textAudio),
			audioBalance: path.join(root, 'review', REVIEW_REPORT_FILENAMES.audioBalance),
			rhythmVisual: path.join(root, 'review', REVIEW_REPORT_FILENAMES.rhythmVisual),
			layout: path.join(root, 'review', REVIEW_REPORT_FILENAMES.layout),
			publish: path.join(root, 'review', REVIEW_REPORT_FILENAMES.publish),
		},
		renderOutputs: {
			current: path.join(root, 'renders', DEFAULT_RENDER_OUTPUTS.current),
			long: path.join(root, 'renders', DEFAULT_RENDER_OUTPUTS.long),
			short: path.join(root, 'renders', DEFAULT_RENDER_OUTPUTS.short),
		},
	};
};

export const ensureDeliverableDirs = (paths) => {
	ensureDir(paths.root);
	DELIVERABLE_SUBDIRS.forEach((dirName) => ensureDir(path.join(paths.root, dirName)));
};

const writeUtf8File = (targetPath, content) => {
	ensureDir(path.dirname(targetPath));
	fs.writeFileSync(targetPath, content, 'utf8');
};

export const writeJsonFile = (targetPath, value) => {
	writeUtf8File(targetPath, `${JSON.stringify(value, null, 2)}\n`);
};

export const snapshotScriptToDeliverable = ({script, paths}) => {
	writeJsonFile(paths.scriptSnapshotPath, script);
	return paths.scriptSnapshotPath;
};

export const seedPublishFilesFromLegacy = ({paths}) => {
	const seeded = [];

	if (!fs.existsSync(paths.publishMetadataPath) && fs.existsSync(paths.legacyMetadataPath)) {
		ensureDir(path.dirname(paths.publishMetadataPath));
		fs.copyFileSync(paths.legacyMetadataPath, paths.publishMetadataPath);
		seeded.push({
			type: 'metadata',
			from: paths.legacyMetadataPath,
			to: paths.publishMetadataPath,
		});
	}

	if (!fs.existsSync(paths.publishThumbnailPath) && fs.existsSync(paths.legacyThumbnailPath)) {
		ensureDir(path.dirname(paths.publishThumbnailPath));
		fs.copyFileSync(paths.legacyThumbnailPath, paths.publishThumbnailPath);
		seeded.push({
			type: 'thumbnail',
			from: paths.legacyThumbnailPath,
			to: paths.publishThumbnailPath,
		});
	}

	return seeded;
};

export const resolveReadablePublishPath = ({paths, kind}) => {
	const preferredPath = kind === 'metadata' ? paths.publishMetadataPath : paths.publishThumbnailPath;
	const legacyPath = kind === 'metadata' ? paths.legacyMetadataPath : paths.legacyThumbnailPath;

	if (fs.existsSync(preferredPath)) {
		return {
			path: preferredPath,
			source: 'project',
		};
	}

	if (fs.existsSync(legacyPath)) {
		return {
			path: legacyPath,
			source: 'legacy-root',
		};
	}

	return {
		path: preferredPath,
		source: 'missing',
	};
};

export const createDeliverableContext = ({
	script,
	projectId,
	deliverableDir,
	seedPublishFromLegacy = false,
	snapshotScript = false,
} = {}) => {
	const activeScript = script ?? readScriptJson();
	const paths = getDeliverablePaths({
		script: activeScript,
		projectId,
		deliverableDir,
	});

	ensureDeliverableDirs(paths);

	const seededPublishFiles = seedPublishFromLegacy ? seedPublishFilesFromLegacy({paths}) : [];
	if (snapshotScript) {
		snapshotScriptToDeliverable({script: activeScript, paths});
	}

	return {
		script: activeScript,
		paths,
		projectWarnings: paths.projectWarnings,
		seededPublishFiles,
	};
};

export const getProjectPaths = getDeliverablePaths;
export const ensureProjectDirs = ensureDeliverableDirs;
export const createProjectContext = createDeliverableContext;
