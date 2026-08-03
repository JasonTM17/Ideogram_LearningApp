import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.claude',
  '.codex',
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
]);

const requiredRepositoryFiles = [
  'README.md',
  'LICENSE',
  'NOTICE.md',
  'content/LICENSE.md',
  'CHANGELOG.md',
  '.github/SECURITY.md',
  '.github/CONTRIBUTING.md',
  '.github/CODE_OF_CONDUCT.md',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'docs/media/ideogram-learning-social-preview.png',
  'docs/media/project-tour.gif',
  'docs/media/system-architecture.png',
  'docs/media/learning-and-sync-flow.png',
];

const markdownFiles = [];
const visit = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) markdownFiles.push(path);
  }
};

for (const directory of ['docs', '.github', 'content']) {
  const absolute = resolve(root, directory);
  if (existsSync(absolute)) visit(absolute);
}
for (const file of ['README.md', 'NOTICE.md', 'CHANGELOG.md']) {
  const absolute = resolve(root, file);
  if (existsSync(absolute)) markdownFiles.push(absolute);
}

const failures = [];
for (const file of requiredRepositoryFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`missing required file: ${file}`);
}

const markdownLinkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
const htmlImagePattern = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;

const normalizeTarget = (rawTarget) => {
  const unwrapped = rawTarget
    .trim()
    .replace(/^<|>$/g, '')
    .split(/\s+["']/)[0];
  if (!unwrapped || /^(?:[a-z]+:|#)/i.test(unwrapped)) return null;
  const withoutFragment = unwrapped.split('#')[0].split('?')[0];
  if (!withoutFragment) return null;
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
};

for (const file of [...new Set(markdownFiles)]) {
  const content = readFileSync(file, 'utf8');
  const targets = [
    ...Array.from(content.matchAll(markdownLinkPattern), (match) => match[1]),
    ...Array.from(content.matchAll(htmlImagePattern), (match) => match[1]),
  ];
  for (const rawTarget of targets) {
    const target = normalizeTarget(rawTarget);
    if (!target) continue;
    const absolute = isAbsolute(target) ? target : resolve(dirname(file), target);
    const firstRelativeSegment = relative(root, absolute).split(sep)[0];
    if (firstRelativeSegment === '..' || !existsSync(absolute)) {
      failures.push(`${relative(root, file)} -> ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Documentation validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Documentation validation passed: ${new Set(markdownFiles).size} Markdown files and ${requiredRepositoryFiles.length} required repository files.`,
);
