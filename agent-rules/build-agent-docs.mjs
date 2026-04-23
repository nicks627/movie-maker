import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routerPath = path.join(rootDir, 'agent-rules', 'router.md');
const targets = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].map((name) => path.join(rootDir, name));

const generatedHeader = [
  '<!-- GENERATED FILE. Edit agent-rules/router.md and run node agent-rules/build-agent-docs.mjs -->',
  '',
].join('\n');

const main = async () => {
  const body = (await readFile(routerPath, 'utf8')).trimEnd();
  const output = `${generatedHeader}${body}\n`;

  await Promise.all(targets.map((target) => writeFile(target, output, 'utf8')));
  console.log(`Generated ${targets.length} agent docs from router.md.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
