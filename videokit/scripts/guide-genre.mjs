/* eslint-env node */
/* global process, console */
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

const PLAYBOOKS = {
	explainer: {
		label: '解説動画',
		playbook: path.join(packageRoot, 'docs', 'playbooks', 'explainer.md'),
		next: 'npm run new:project -- --template explainer --project-id starter-explainer --title "新しい解説動画"',
	},
	gameplay: {
		label: 'ゲーム実況',
		playbook: path.join(packageRoot, 'docs', 'playbooks', 'gameplay.md'),
		next: 'npm run new:project -- --template gameplay --project-id starter-gameplay --title "新しいゲーム実況動画"',
	},
	'line-chat': {
		label: 'LINEチャット',
		playbook: path.join(packageRoot, 'docs', 'playbooks', 'line-chat.md'),
		next: 'npm run new:project -- --template line-chat --project-id starter-line-chat --title "新しいLINEチャット動画"',
	},
	political: {
		label: '政治系',
		playbook: path.join(packageRoot, 'docs', 'playbooks', 'political.md'),
		next: 'npm run new:project -- --template political --project-id starter-political --title "新しい政治系動画"',
	},
	generic: {
		label: 'その他',
		playbook: path.join(packageRoot, 'docs', 'playbooks', 'generic.md'),
		next: 'npm run new:project -- --template generic --project-id starter-generic --title "新しい動画"',
	},
};

const parseArgs = () => {
	const args = process.argv.slice(2);
	let template = null;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--template' && args[index + 1]) {
			template = args[index + 1];
			index += 1;
			continue;
		}

		if (arg.startsWith('--template=')) {
			template = arg.slice('--template='.length);
		}
	}

	return {template};
};

const main = () => {
	const {template} = parseArgs();
	if (!template || !(template in PLAYBOOKS)) {
		const supported = Object.entries(PLAYBOOKS)
			.map(([key, value]) => `- ${key}: ${value.label}`)
			.join('\n');
		throw new Error(`Pass --template <type>.\nSupported templates:\n${supported}`);
	}

	const item = PLAYBOOKS[template];
	console.log(`# ${item.label}`);
	console.log('');
	console.log(`Playbook: ${item.playbook}`);
	console.log(`Next: ${item.next}`);
	console.log('Then: npm run review:preflight -- --variant long');
};

main();
