import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { inspectEnvironmentContract } from './environment-contract.mjs';

describe('environment contract', () => {
  let workspaceRoot;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), 'ideogram-env-contract-'));
    for (const appName of ['web', 'mobile', 'worker']) {
      mkdirSync(path.join(workspaceRoot, 'apps', appName), { recursive: true });
    }
  });

  afterEach(() => {
    rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it('rejects a public AI secret from a framework dotenv file without exposing its value', () => {
    const secretValue = 'test-secret-that-must-not-appear';
    writeFileSync(
      path.join(workspaceRoot, 'apps', 'web', '.env.local'),
      `NEXT_PUBLIC_DEEPSEEK_API_KEY=${secretValue}`,
    );

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'workspace',
        workspaceRoot,
      }),
    ).toThrow(/NEXT_PUBLIC_DEEPSEEK_API_KEY/u);

    try {
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'workspace',
        workspaceRoot,
      });
    } catch (error) {
      expect(error.message).not.toContain(secretValue);
    }
  });

  it('rejects Expo public AI secrets and accepts empty placeholders', () => {
    const mobileEnvironmentPath = path.join(workspaceRoot, 'apps', 'mobile', '.env.production');
    writeFileSync(mobileEnvironmentPath, 'EXPO_PUBLIC_DEEPSEEK_API_KEY=dummy-value');

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'mobile',
        workspaceRoot,
      }),
    ).toThrow(/EXPO_PUBLIC_DEEPSEEK_API_KEY/u);

    writeFileSync(mobileEnvironmentPath, 'EXPO_PUBLIC_DEEPSEEK_API_KEY=');
    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'mobile',
        workspaceRoot,
      }),
    ).not.toThrow();
  });

  it('allows a Supabase service credential only in the worker dotenv boundary', () => {
    writeFileSync(
      path.join(workspaceRoot, 'apps', 'worker', '.env.local'),
      'SUPABASE_SERVICE_ROLE_KEY=worker-only-placeholder',
    );

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'worker',
        workspaceRoot,
      }),
    ).not.toThrow();

    writeFileSync(
      path.join(workspaceRoot, '.env.local'),
      'SUPABASE_SERVICE_ROLE_KEY=wrong-location-placeholder',
    );

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'worker',
        workspaceRoot,
      }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/u);
  });

  it('rejects every public Supabase privileged-secret spelling without printing its value', () => {
    const secretValue = 'supabase-secret-that-must-not-appear';
    writeFileSync(
      path.join(workspaceRoot, 'apps', 'mobile', '.env.production'),
      `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${secretValue}`,
    );

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'mobile',
        workspaceRoot,
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/u);

    try {
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'mobile',
        workspaceRoot,
      });
    } catch (error) {
      expect(error.message).not.toContain(secretValue);
    }
  });

  const itOnSymlinkCapablePlatforms = process.platform === 'win32' ? it.skip : it;

  itOnSymlinkCapablePlatforms('rejects a public AI secret in a dotenv symlink', () => {
    const targetFile = path.join(workspaceRoot, 'linked-secret-source');
    writeFileSync(targetFile, 'NEXT_PUBLIC_DEEPSEEK_API_KEY=dummy-symlink-value');
    symlinkSync(targetFile, path.join(workspaceRoot, 'apps', 'web', '.env.local'), 'file');

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'web',
        workspaceRoot,
      }),
    ).toThrow(/NEXT_PUBLIC_DEEPSEEK_API_KEY/u);
  });

  it('applies framework precedence before validating protected configuration', () => {
    const webRoot = path.join(workspaceRoot, 'apps', 'web');
    writeFileSync(path.join(webRoot, '.env'), 'DEEPSEEK_MODEL=unsupported-model');
    writeFileSync(path.join(webRoot, '.env.production.local'), 'DEEPSEEK_MODEL=deepseek-v4-flash');

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: {},
        target: 'web',
        workspaceRoot,
      }),
    ).not.toThrow();
  });

  it('validates model, mode, effort and HTTPS URL values', () => {
    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: { DEEPSEEK_BASE_URL: 'http://api.example.test' },
        target: 'worker',
        workspaceRoot,
      }),
    ).toThrow(/valid HTTPS URL/u);

    expect(() =>
      inspectEnvironmentContract({
        runtimeEnvironment: { DEEPSEEK_REASONING_EFFORT: 'extreme' },
        target: 'worker',
        workspaceRoot,
      }),
    ).toThrow(/DEEPSEEK_REASONING_EFFORT/u);
  });
});
