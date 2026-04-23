import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');
const DEFAULT_OUTPUT = path.join(DATA_DIR, 'script.json');

const TEMPLATE_MAP = {
  explainer: {
    sample: path.join(DATA_DIR, 'explainer.sample.json'),
    defaultTitle: '新しい解説動画',
    defaultTemplateId: 'yukkuri-explainer',
  },
  gameplay: {
    sample: path.join(DATA_DIR, 'gameplay-commentary.sample.json'),
    defaultTitle: '新しいゲーム実況動画',
    defaultTemplateId: 'game-play-commentary',
  },
  'line-chat': {
    sample: path.join(DATA_DIR, 'line-chat.sample.json'),
    defaultTitle: '新しいLINEチャット動画',
    defaultTemplateId: 'line-chat',
  },
  political: {
    sample: path.join(DATA_DIR, 'explainer.sample.json'),
    defaultTitle: '新しい政治系動画',
    defaultTemplateId: 'yukkuri-explainer',
  },
  generic: {
    sample: path.join(DATA_DIR, 'explainer.sample.json'),
    defaultTitle: '新しい動画',
    defaultTemplateId: 'yukkuri-explainer',
  },
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    template: '',
    projectId: '',
    title: '',
    output: DEFAULT_OUTPUT,
    force: false,
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
    }
  }

  if (!parsed.template) {
    throw new Error('Pass --template <explainer|gameplay|line-chat|political|generic>.');
  }

  return parsed;
};

const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const writeFile = (targetPath, content) => {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, 'utf8');
};

const buildMetadataTemplate = ({ projectId, title, template }) => `# YouTube Metadata

## Video

- Project ID: ${projectId}
- Template: ${template}
- Theme: TODO
- Search angles: TODO
- Fact basis: TODO

## Long

### Recommended title

${title}

### Alternate titles

- TODO

### Description

TODO

### Tags

TODO

### Pinned comment idea

TODO

## Short

### Recommended title

${title} Shorts

### Alternate titles

- TODO

### Description

TODO

### Tags

TODO
`;

const buildThumbnailTemplate = ({ title }) => `# Thumbnail Prompt

## Long

### Recommended overlay text

- ${title}

### Alternate overlay text

- TODO

### Prompt

TODO

### Negative prompt

TODO

### Color direction

TODO

## Short

### Recommended overlay text

- TODO

### Prompt

TODO
`;

const normalizeStarterJson = ({ data, template, projectId, title }) => {
  const output = structuredClone(data);
  output.project = output.project && typeof output.project === 'object' ? output.project : {};
  output.project.id = projectId;
  output.project.title = title;
  output.project.version = output.project.version ?? 1;

  output.template = output.template && typeof output.template === 'object' ? output.template : {};
  output.template.id = TEMPLATE_MAP[template].defaultTemplateId;

  if (template === 'political') {
    output.project.category = 'political';
    output.project.defaultVariant = 'long';
  }

  if (template === 'generic') {
    output.project.category = 'generic';
  }

  if (template === 'gameplay') {
    output.timeline = output.timeline && typeof output.timeline === 'object' ? output.timeline : {};
    output.timeline.gameplay =
      output.timeline.gameplay && typeof output.timeline.gameplay === 'object'
        ? output.timeline.gameplay
        : {};
    output.timeline.gameplay.title = title;
  }

  if (template === 'line-chat') {
    output.project.defaultVariant = output.project.defaultVariant ?? 'portrait';
  }

  return output;
};

const main = () => {
  const args = parseArgs();
  const definition = TEMPLATE_MAP[args.template];
  if (!definition) {
    throw new Error(`Unknown template: ${args.template}`);
  }

  const title = args.title || definition.defaultTitle;
  const projectId = args.projectId || slugify(title) || `starter-${args.template}`;
  const outputPath = args.output;

  if (fs.existsSync(outputPath) && !args.force) {
    throw new Error(
      `Output already exists: ${outputPath}\nUse --force to overwrite or pass --output <path>.`,
    );
  }

  const sampleData = JSON.parse(fs.readFileSync(definition.sample, 'utf8'));
  const starterJson = normalizeStarterJson({
    data: sampleData,
    template: args.template,
    projectId,
    title,
  });

  writeFile(outputPath, `${JSON.stringify(starterJson, null, 2)}\n`);

  const projectDir = path.join(PROJECT_ROOT, 'projects', projectId);
  const publishDir = path.join(projectDir, 'publish');
  const sourceDir = path.join(projectDir, 'source');
  ensureDir(publishDir);
  ensureDir(sourceDir);

  const metadataPath = path.join(publishDir, 'youtube_metadata.md');
  const thumbnailPath = path.join(publishDir, 'thumbnail_prompt.md');
  const snapshotPath = path.join(sourceDir, 'script.snapshot.json');

  writeFile(
    metadataPath,
    buildMetadataTemplate({ projectId, title, template: args.template }),
  );
  writeFile(thumbnailPath, buildThumbnailTemplate({ title }));
  writeFile(snapshotPath, `${JSON.stringify(starterJson, null, 2)}\n`);

  process.stdout.write(
    `${JSON.stringify(
      {
        template: args.template,
        projectId,
        title,
        output: outputPath,
        metadata: metadataPath,
        thumbnail: thumbnailPath,
        snapshot: snapshotPath,
      },
      null,
      2,
    )}\n`,
  );
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
