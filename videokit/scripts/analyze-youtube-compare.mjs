/* eslint-env node */
/* global process, console */
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const parseArgs = () => {
	const args = process.argv.slice(2);
	const urls = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--url' && args[index + 1]) {
			urls.push(args[index + 1]);
			index += 1;
			continue;
		}

		if (arg.startsWith('--url=')) {
			urls.push(arg.slice('--url='.length));
		}
	}

	if (urls.length < 2) {
		throw new Error('Pass at least two --url values to compare reference videos.');
	}

	return args;
};

const main = () => {
	const passthroughArgs = parseArgs();
	const scriptPath = path.join(process.cwd(), 'scripts', 'analyze-youtube.mjs');
	const result = spawnSync(process.execPath, [scriptPath, ...passthroughArgs], {
		stdio: 'inherit',
	});

	if (typeof result.status === 'number' && result.status !== 0) {
		process.exitCode = result.status;
	}
};

main();
