import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(rootDir, 'AGENTS.md');
const modulesDir = path.join(rootDir, 'agent-rules', 'modules');

const sections = [
  {
    file: '00-foundation.md',
    start: '# Movie Maker Project Rules',
    end: '## 2. Template: 解説動画 (Explanation Video)',
  },
  {
    file: '10-explanation-video.md',
    start: '## 2. Template: 解説動画 (Explanation Video)',
    end: '## 3. Template: ゲーム実況 (Game Commentary)',
  },
  {
    file: '20-game-commentary.md',
    start: '## 3. Template: ゲーム実況 (Game Commentary)',
    end: '## 4. Template: LINEチャット (LINE Chat Drama)',
  },
  {
    file: '30-line-chat.md',
    start: '## 4. Template: LINEチャット (LINE Chat Drama)',
    end: '## 5. Animations (all templates)',
  },
  {
    file: '40-animations-and-diagrams.md',
    start: '## 5. Animations (all templates)',
    end: '## 7. Speaker Conventions',
  },
  {
    file: '50-speakers-and-paths.md',
    start: '## 7. Speaker Conventions',
    end: null,
  },
];

const extractSection = (content, startMarker, endMarker) => {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`Start marker not found: ${startMarker}`);
  }

  const endIndex = endMarker ? content.indexOf(endMarker, startIndex) : content.length;
  if (endMarker && endIndex === -1) {
    throw new Error(`End marker not found: ${endMarker}`);
  }

  return content.slice(startIndex, endIndex).trimEnd();
};

const main = async () => {
  const content = await readFile(sourcePath, 'utf8');
  await mkdir(modulesDir, { recursive: true });

  for (const section of sections) {
    const body = extractSection(content, section.start, section.end);
    await writeFile(path.join(modulesDir, section.file), `${body}\n`, 'utf8');
  }

  console.log(`Created ${sections.length} agent rule modules in ${modulesDir}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
