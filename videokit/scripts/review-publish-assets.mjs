import fs from 'node:fs';
import path from 'node:path';
import {
  createDeliverableContext,
  resolveReadablePublishPath,
  writeJsonFile,
} from './deliverable-utils.mjs';

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

  return { variant, deliverableDir, projectId };
};

const hasVariantScenes = (script, variant) => {
  if (Array.isArray(script?.[variant]?.scenes)) {
    return true;
  }

  const activeVariant = script.renderVariant ?? script.activeVariant ?? script.project?.defaultVariant ?? 'long';
  return variant === activeVariant && Array.isArray(script?.timeline?.gameplay?.segments);
};

const resolveVariants = (script, requestedVariant) => {
  if (requestedVariant === 'current') {
    const activeVariant = script.activeVariant ?? script.project?.defaultVariant ?? 'long';
    return [activeVariant];
  }

  if (requestedVariant === 'both' || requestedVariant === 'all') {
    return ['long', 'short'].filter((variant) => hasVariantScenes(script, variant));
  }

  return [requestedVariant].filter((variant) => hasVariantScenes(script, variant));
};

const createIssue = ({
  level = 'warning',
  type,
  message,
  current,
  expected,
}) => ({
  level,
  type,
  message,
  current: current ?? null,
  expected: expected ?? null,
});

const hasHeading = (content, heading) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}\\s*$`, 'm').test(content);
};

const requireHeading = (issues, content, heading, fileLabel) => {
  if (!hasHeading(content, heading)) {
    issues.push(
      createIssue({
        level: 'error',
        type: 'missing-heading',
        message: `${fileLabel} に ${heading} がありません。`,
        expected: heading,
      }),
    );
  }
};

const requireAllHeadings = (issues, content, headings, fileLabel) => {
  headings.forEach((heading) => requireHeading(issues, content, heading, fileLabel));
};

const requirePattern = (issues, content, pattern, fileLabel, message, expected) => {
  if (!pattern.test(content)) {
    issues.push(
      createIssue({
        level: 'error',
        type: 'missing-credit-detail',
        message: `${fileLabel} ${message}`,
        expected,
      }),
    );
  }
};

const requireVariantMetadataSections = (issues, metadataContent, label) => {
  requireAllHeadings(
    issues,
    metadataContent,
    [
      `## ${label}`,
      '### Recommended title (JA)',
      '### Alternate titles (JA)',
      '### Description (JA)',
      '### Pinned comment idea (JA)',
      '### Recommended title (EN)',
      '### Alternate titles (EN)',
      '### Description (EN)',
      '### Pinned comment idea (EN)',
      '### Tags',
      '### Credits',
    ],
    'youtube_metadata.md',
  );
};

const findDuplicatePublishFiles = (publishDir) => {
  if (!fs.existsSync(publishDir)) {
    return [];
  }

  return fs
    .readdirSync(publishDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        (/^youtube_metadata\..+\.md$/i.test(name) && name !== 'youtube_metadata.md') ||
        (/^thumbnail_prompt\..+\.md$/i.test(name) && name !== 'thumbnail_prompt.md'),
    );
};

const main = () => {
  const options = parseArgs();
  const script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
  const variants = resolveVariants(script, options.variant);
  const deliverableContext = createDeliverableContext({
    script,
    projectId: options.projectId,
    deliverableDir: options.deliverableDir,
    seedPublishFromLegacy: true,
    snapshotScript: true,
  });
  const issues = [];

  if (variants.length === 0) {
    throw new Error(`Variant "${options.variant}" does not contain scenes.`);
  }

  const metadataRef = resolveReadablePublishPath({
    paths: deliverableContext.paths,
    kind: 'metadata',
  });
  const thumbnailRef = resolveReadablePublishPath({
    paths: deliverableContext.paths,
    kind: 'thumbnail',
  });

  const fileChecks = [
    { label: 'youtube_metadata.md', path: metadataRef.path },
    { label: 'thumbnail_prompt.md', path: thumbnailRef.path },
  ];

  for (const fileCheck of fileChecks) {
    if (!fs.existsSync(fileCheck.path)) {
      issues.push(
        createIssue({
          level: 'error',
          type: 'missing-file',
          message: `${fileCheck.label} が見つかりません。動画納品時は必ず作成してください。`,
          expected: fileCheck.path,
        }),
      );
      continue;
    }

    const content = fs.readFileSync(fileCheck.path, 'utf8').trim();
    if (!content) {
      issues.push(
        createIssue({
          level: 'error',
          type: 'empty-file',
          message: `${fileCheck.label} が空です。`,
          expected: 'non-empty file',
        }),
      );
    }
  }

  if (metadataRef.source === 'legacy-root') {
    issues.push(
      createIssue({
        level: 'warning',
        type: 'legacy-publish-fallback',
        message: 'youtube_metadata.md が projects 配下に見つからず、legacy root を参照しました。今後は projects/<project.id>/publish/ を正本にしてください。',
        current: metadataRef.path,
        expected: deliverableContext.paths.publishMetadataPath,
      }),
    );
  }

  if (thumbnailRef.source === 'legacy-root') {
    issues.push(
      createIssue({
        level: 'warning',
        type: 'legacy-publish-fallback',
        message: 'thumbnail_prompt.md が projects 配下に見つからず、legacy root を参照しました。今後は projects/<project.id>/publish/ を正本にしてください。',
        current: thumbnailRef.path,
        expected: deliverableContext.paths.publishThumbnailPath,
      }),
    );
  }

  const duplicatePublishFiles = findDuplicatePublishFiles(deliverableContext.paths.publishDir);
  if (duplicatePublishFiles.length > 0) {
    issues.push(
      createIssue({
        level: 'error',
        type: 'duplicate-publish-files',
        message: `publish 配下に重複した metadata / prompt コピーがあります: ${duplicatePublishFiles.join(', ')}`,
        current: duplicatePublishFiles,
        expected: ['youtube_metadata.md', 'thumbnail_prompt.md'],
      }),
    );
  }

  const metadataContent = fs.existsSync(metadataRef.path) ? fs.readFileSync(metadataRef.path, 'utf8') : '';
  const thumbnailContent = fs.existsSync(thumbnailRef.path) ? fs.readFileSync(thumbnailRef.path, 'utf8') : '';

  if (metadataContent) {
    requireAllHeadings(
      issues,
      metadataContent,
      [
        '# YouTube Metadata',
        '## Video',
      ],
      'youtube_metadata.md',
    );

    for (const variant of variants) {
      const label = variant === 'long' ? 'Long' : 'Short';
      requireVariantMetadataSections(issues, metadataContent, label);
    }

    requirePattern(
      issues,
      metadataContent,
      /VOICEVOX\s*:\s*[^\r\n]+/i,
      'youtube_metadata.md',
      'に VOICEVOX 話者クレジットがありません。',
      'VOICEVOX:春日部つむぎ / VOICEVOX:青山龍星',
    );

    requirePattern(
      issues,
      metadataContent,
      /BGM\s*:\s*[^\r\n]+/i,
      'youtube_metadata.md',
      'に BGM クレジットがありません。',
      'BGM: 曲名 / 配布元',
    );

    requirePattern(
      issues,
      metadataContent,
      /###\s+Recommended title \(EN\)[\s\S]+?[A-Za-z]/m,
      'youtube_metadata.md',
      'に英語版タイトルがありません。',
      '### Recommended title (EN)',
    );

    requirePattern(
      issues,
      metadataContent,
      /###\s+Description \(EN\)[\s\S]+?[A-Za-z]/m,
      'youtube_metadata.md',
      'に英語版説明欄がありません。',
      '### Description (EN)',
    );
  }

  if (thumbnailContent) {
    requireHeading(issues, thumbnailContent, '# Thumbnail Prompt', 'thumbnail_prompt.md');
    for (const variant of variants) {
      const label = variant === 'long' ? 'Long' : 'Short';
      requireAllHeadings(
        issues,
        thumbnailContent,
        [
          `## ${label}`,
          '### Recommended overlay text',
          '### Alternate overlay text',
          '### Prompt',
          '### Negative prompt',
        ],
        'thumbnail_prompt.md',
      );
    }

    requireHeading(issues, thumbnailContent, '### Color direction', 'thumbnail_prompt.md');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scriptPath: SCRIPT_PATH,
    deliverableRoot: deliverableContext.paths.root,
    metadataPath: metadataRef.path,
    thumbnailPromptPath: thumbnailRef.path,
    variants,
    seededPublishFiles: deliverableContext.seededPublishFiles,
    summary: {
      totalIssues: issues.length,
      errors: issues.filter((issue) => issue.level === 'error').length,
      warnings: issues.filter((issue) => issue.level === 'warning').length,
      status: issues.length === 0 ? 'ok' : 'needs-review',
    },
    workflow: [
      '1. 動画を書き出す',
      '2. projects/<project.id>/publish/youtube_metadata.md を今のテーマに合わせて更新する',
      '3. projects/<project.id>/publish/thumbnail_prompt.md を今のテーマに合わせて更新する',
      '4. metadata には検索軸 / 代替タイトル / 固定コメント案まで含める',
      '5. thumbnail prompt には文言案 / negative prompt / 色方針まで含める',
      '6. npm run review:publish または npm run review:delivery を実行する',
    ],
    issues,
  };

  writeJsonFile(deliverableContext.paths.reviewReportPaths.publish, report);

  console.log(`Wrote ${deliverableContext.paths.reviewReportPaths.publish}`);
  console.log(`Issues: ${report.summary.totalIssues} (errors: ${report.summary.errors}, warnings: ${report.summary.warnings})`);

  if (issues.length > 0) {
    process.exitCode = 1;
  }
};

main();
