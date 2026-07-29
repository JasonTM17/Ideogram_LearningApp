import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildJapaneseN5PilotManifest } from '../content/japanese/v1/source/pilot-release-manifest.mjs';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(workspaceRoot, 'content', 'japanese', 'v1', 'manifest.json');

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(buildJapaneseN5PilotManifest(), null, 2)}\n`);
console.log(`Generated ${path.relative(workspaceRoot, outputPath)}.`);
