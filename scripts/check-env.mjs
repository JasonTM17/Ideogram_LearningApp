import { inspectEnvironmentContract } from './environment-contract.mjs';

const targetIndex = process.argv.indexOf('--target');
const target = targetIndex === -1 ? 'workspace' : process.argv[targetIndex + 1];
const requireSecrets = process.argv.includes('--require-secrets');

try {
  const result = inspectEnvironmentContract({
    requireSecrets,
    target,
    workspaceRoot: process.cwd(),
  });
  const secretStatus = result.needsServerSecret
    ? 'a protected secret check'
    : 'no secret requirement';
  console.log(`Environment contract valid for ${target} (${secretStatus}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Environment contract validation failed.');
  process.exitCode = 1;
}
