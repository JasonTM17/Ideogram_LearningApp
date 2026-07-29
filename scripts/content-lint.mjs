import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { lintContentWorkspace } from './content-lint-lib.mjs';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = lintContentWorkspace({ workspaceRoot });

if (!result.valid) {
  console.error('Content lint failed:');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Content lint passed.');
}
