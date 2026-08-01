import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

export const environmentTargets = new Set(['workspace', 'web', 'mobile', 'worker']);
export const forbiddenPublicSecretNames = [
  'NEXT_PUBLIC_DEEPSEEK_API_KEY',
  'EXPO_PUBLIC_DEEPSEEK_API_KEY',
  'NEXT_PUBLIC_LEARNING_DATABASE_URL',
  'EXPO_PUBLIC_LEARNING_DATABASE_URL',
];
export const workerOnlySupabaseSecretNames = [
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_DB_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const supportedModels = new Set(['deepseek-v4-flash', 'deepseek-v4-pro']);
const thinkingModes = new Set(['disabled', 'enabled']);
const reasoningEfforts = new Set(['low', 'medium', 'high']);

const defaultAiConfiguration = {
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  DEEPSEEK_TUTOR_THINKING_MODE: 'disabled',
  DEEPSEEK_GRADING_THINKING_MODE: 'enabled',
  DEEPSEEK_REASONING_EFFORT: 'high',
};

const isDotenvFile = (fileName) =>
  (fileName === '.env' || fileName.startsWith('.env.')) && fileName !== '.env.example';

const projectDirectoriesForTarget = (workspaceRoot, target) => {
  const directoriesByTarget = {
    workspace: [
      workspaceRoot,
      path.join(workspaceRoot, 'apps', 'web'),
      path.join(workspaceRoot, 'apps', 'mobile'),
      path.join(workspaceRoot, 'apps', 'worker'),
    ],
    web: [path.join(workspaceRoot, 'apps', 'web')],
    mobile: [path.join(workspaceRoot, 'apps', 'mobile')],
    worker: [workspaceRoot, path.join(workspaceRoot, 'apps', 'worker')],
  };

  return directoriesByTarget[target].filter((directory) => existsSync(directory));
};

const parseDotenvFile = (filePath, workspaceRoot) => {
  try {
    return parseEnv(readFileSync(filePath, 'utf8'));
  } catch {
    const displayPath = path.relative(workspaceRoot, filePath) || path.basename(filePath);
    throw new Error(`Invalid dotenv syntax in ${displayPath}.`);
  }
};

const getDotenvFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true })
    .filter((entry) => isDotenvFile(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .filter((filePath) => {
      try {
        return statSync(filePath).isFile();
      } catch {
        return false;
      }
    })
    .sort();

const getLoadOrder = (nodeEnvironment) => [
  '.env',
  `.env.${nodeEnvironment}`,
  ...(nodeEnvironment === 'test' ? [] : ['.env.local']),
  `.env.${nodeEnvironment}.local`,
];

const isWorkerEnvironmentFile = (filePath, workspaceRoot) => {
  const workerDirectory = path.join(workspaceRoot, 'apps', 'worker');
  const relativePath = path.relative(workerDirectory, filePath);

  return (
    relativePath.length > 0 && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
  );
};

const isWebEnvironmentFile = (filePath, workspaceRoot) => {
  const webDirectory = path.join(workspaceRoot, 'apps', 'web');
  const relativePath = path.relative(webDirectory, filePath);

  return (
    relativePath.length > 0 && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
  );
};

const isPublicSupabaseSecretName = (name) =>
  /^(NEXT_PUBLIC|EXPO_PUBLIC)_SUPABASE_(DB_PASSWORD|DB_URL|SECRET_KEY|SERVICE_ROLE_KEY)$/u.test(
    name,
  );

const resolveProjectEnvironment = (
  directory,
  nodeEnvironment,
  runtimeEnvironment,
  workspaceRoot,
) => {
  const fileEnvironment = {};

  for (const fileName of getLoadOrder(nodeEnvironment)) {
    const filePath = path.join(directory, fileName);
    if (existsSync(filePath)) {
      Object.assign(fileEnvironment, parseDotenvFile(filePath, workspaceRoot));
    }
  }

  return { ...fileEnvironment, ...runtimeEnvironment };
};

const validateEnum = (configuration, name, allowedValues) => {
  const value = configuration[name]?.trim() || defaultAiConfiguration[name];
  if (!allowedValues.has(value)) {
    throw new Error(`Invalid ${name}; allowed values: ${[...allowedValues].join(', ')}.`);
  }
};

const validateAiConfiguration = (configuration) => {
  const baseUrl =
    configuration.DEEPSEEK_BASE_URL?.trim() || defaultAiConfiguration.DEEPSEEK_BASE_URL;

  try {
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error();
    }
  } catch {
    throw new Error('DEEPSEEK_BASE_URL must be a valid HTTPS URL.');
  }

  validateEnum(configuration, 'DEEPSEEK_MODEL', supportedModels);
  validateEnum(configuration, 'DEEPSEEK_TUTOR_THINKING_MODE', thinkingModes);
  validateEnum(configuration, 'DEEPSEEK_GRADING_THINKING_MODE', thinkingModes);
  validateEnum(configuration, 'DEEPSEEK_REASONING_EFFORT', reasoningEfforts);
};

export const inspectEnvironmentContract = ({
  workspaceRoot,
  target,
  requireSecrets = false,
  runtimeEnvironment = process.env,
  nodeEnvironment = runtimeEnvironment.NODE_ENV || 'production',
}) => {
  if (!environmentTargets.has(target)) {
    throw new Error('Invalid environment target. Use workspace, web, mobile, or worker.');
  }

  if (!['development', 'production', 'test'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, production, or test.');
  }

  const projectDirectories = projectDirectoriesForTarget(workspaceRoot, target);
  const dotenvFiles = projectDirectories.flatMap(getDotenvFiles);
  const exposedLocations = [];

  for (const filePath of dotenvFiles) {
    const parsedFile = parseDotenvFile(filePath, workspaceRoot);
    for (const name of forbiddenPublicSecretNames) {
      if (parsedFile[name]?.trim()) {
        exposedLocations.push(`${name} in ${path.relative(workspaceRoot, filePath)}`);
      }
    }

    for (const name of workerOnlySupabaseSecretNames) {
      if (parsedFile[name]?.trim() && !isWorkerEnvironmentFile(filePath, workspaceRoot)) {
        exposedLocations.push(
          `${name} outside apps/worker in ${path.relative(workspaceRoot, filePath)}`,
        );
      }
    }

    if (
      parsedFile.LEARNING_DATABASE_URL?.trim() &&
      !isWebEnvironmentFile(filePath, workspaceRoot)
    ) {
      exposedLocations.push(
        `LEARNING_DATABASE_URL outside apps/web in ${path.relative(workspaceRoot, filePath)}`,
      );
    }

    for (const [name, value] of Object.entries(parsedFile)) {
      if (value.trim() && isPublicSupabaseSecretName(name)) {
        exposedLocations.push(`${name} in ${path.relative(workspaceRoot, filePath)}`);
      }
    }
  }

  for (const name of forbiddenPublicSecretNames) {
    if (runtimeEnvironment[name]?.trim()) {
      exposedLocations.push(`${name} in the process environment`);
    }
  }

  if (target !== 'worker') {
    for (const name of workerOnlySupabaseSecretNames) {
      if (runtimeEnvironment[name]?.trim()) {
        exposedLocations.push(`${name} in the process environment outside the worker target`);
      }
    }
  }

  if (
    target !== 'workspace' &&
    target !== 'web' &&
    runtimeEnvironment.LEARNING_DATABASE_URL?.trim()
  ) {
    exposedLocations.push(
      `LEARNING_DATABASE_URL in the process environment outside the web target`,
    );
  }

  for (const [name, value] of Object.entries(runtimeEnvironment)) {
    if (value?.trim() && isPublicSupabaseSecretName(name)) {
      exposedLocations.push(`${name} in the process environment`);
    }
  }

  if (exposedLocations.length > 0) {
    throw new Error(
      `Forbidden public or non-worker secret variable(s): ${exposedLocations.join(', ')}.`,
    );
  }

  const resolvedEnvironments = projectDirectories.map((directory) =>
    resolveProjectEnvironment(directory, nodeEnvironment, runtimeEnvironment, workspaceRoot),
  );
  resolvedEnvironments.forEach(validateAiConfiguration);

  const needsServerSecret = requireSecrets && (target === 'workspace' || target === 'worker');
  if (
    needsServerSecret &&
    !resolvedEnvironments.some((configuration) => configuration.DEEPSEEK_API_KEY?.trim())
  ) {
    throw new Error('DEEPSEEK_API_KEY is required for a protected worker or AI runtime check.');
  }

  return {
    dotenvFileCount: dotenvFiles.length,
    needsServerSecret,
    target,
  };
};
