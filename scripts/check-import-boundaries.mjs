import { ESLint } from 'eslint';

const probes = [
  {
    filePath: 'apps/mobile/src/node-built-in-probe.ts',
    importSource: "import 'fs';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/node-prefix-probe.ts',
    importSource: "import 'node:path';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/javascript-probe.js',
    importSource: "import 'node:fs';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/dynamic-probe.ts',
    importSource: "void import('node:fs');",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/non-static-dynamic-probe.ts',
    importSource: "const moduleName = 'node:fs'; void import(moduleName);",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/commonjs-probe.cjs',
    importSource: "require('node:fs');",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/commonjs-allowed-target-probe.cjs',
    importSource: "require('react-native');",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/commonjs-resolve-probe.cjs',
    importSource: "const moduleName = 'node:fs'; require.resolve(moduleName);",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/node-runtime-loader-probe.ts',
    importSource: "process.getBuiltinModule('fs');",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/server-only-probe.ts',
    importSource: "import 'server-only';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/cross-app-probe.ts',
    importSource: "import '../../worker/src/worker-health';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/normalized-cross-app-probe.ts',
    importSource: "import '../../mobile/../worker/src/worker-health';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/worker-package-probe.ts',
    importSource: "import '@ideogram/worker';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/file-url-probe.ts',
    importSource: "import 'file:///D:/Ideogram_LearningApp/apps/worker/src/worker-health';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/node-built-in-probe.ts',
    importSource: "import 'node:crypto';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/server-only-probe.ts',
    importSource: "import 'server-only';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/platform-probe.ts',
    importSource: "import 'react';",
    shouldReject: true,
  },
  {
    filePath: 'packages/future-domain/src/open-workspace-probe.ts',
    importSource: "import 'node:crypto';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/expo-package-probe.ts',
    importSource: "void import('expo-status-bar');",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/non-static-dynamic-probe.ts',
    importSource: "const moduleName = '@ideogram/worker'; void import(moduleName);",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/module-require-probe.cjs',
    importSource: "module.require('node:fs');",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/computed-module-require-probe.cjs',
    importSource: "module['require']('node:fs');",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/create-require-probe.cjs',
    importSource: 'module.createRequire(__filename);',
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/computed-resolve-probe.cjs',
    importSource: "require['resolve']('node:fs');",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/expo-scope-probe.ts',
    importSource: "import '@expo/metro-runtime';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/native-web-probe.js',
    importSource: "import 'react-native-web';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/data-url-probe.ts',
    importSource: "import 'data:text/javascript,export default 1';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/mobile-package-probe.ts',
    importSource: "import '@ideogram/mobile';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/cross-app-probe.ts',
    importSource: "import '../../../apps/worker/src/worker-health';",
    shouldReject: true,
  },
  {
    filePath: 'packages/contracts/src/normalized-cross-app-probe.ts',
    importSource: "import '../../../apps/mobile/../worker/src/worker-health';",
    shouldReject: true,
  },
  {
    filePath: 'apps/mobile/src/native-runtime-probe.ts',
    importSource: "import 'react-native';",
    shouldReject: false,
  },
  {
    filePath: 'packages/contracts/src/local-contract-probe.ts',
    importSource: "import './api';",
    shouldReject: false,
  },
  {
    filePath: 'packages/contracts/src/dynamic-local-probe.ts',
    importSource: "void import('./api');",
    shouldReject: false,
  },
  {
    filePath: 'apps/web/src/app/client-node-built-in-probe.tsx',
    importSource: "'use client'; import 'node:fs'; export const ClientProbe = null;",
    shouldReject: true,
  },
  {
    filePath: 'apps/web/src/app/client-dynamic-probe.tsx',
    importSource:
      "'use client'; const moduleName = 'node:fs'; void import(moduleName); export const ClientProbe = null;",
    shouldReject: true,
  },
  {
    filePath: 'apps/web/src/app/client-runtime-loader-probe.tsx',
    importSource: "'use client'; process.getBuiltinModule('fs'); export const ClientProbe = null;",
    shouldReject: true,
  },
  {
    filePath: 'apps/web/src/app/client-next-server-probe.tsx',
    importSource: "'use client'; import 'next/headers'; export const ClientProbe = null;",
    shouldReject: true,
  },
  {
    filePath: 'apps/web/src/app/client-next-navigation-probe.tsx',
    importSource: "'use client'; import 'next/navigation'; export const ClientProbe = null;",
    shouldReject: false,
  },
  {
    filePath: 'apps/web/components/client-node-built-in-probe.tsx',
    importSource: "'use client'; import 'node:fs'; export const ClientProbe = null;",
    shouldReject: true,
  },
  {
    filePath: 'apps/web/src/app/server-node-built-in-probe.ts',
    importSource: "import 'node:fs';",
    shouldReject: false,
  },
];

const eslint = new ESLint({ cwd: process.cwd() });
const failures = [];

for (const probe of probes) {
  const [result] = await eslint.lintText(probe.importSource, { filePath: probe.filePath });
  const restrictedMessages = result.messages.filter(
    (message) => message.ruleId === 'ideogram/import-boundaries',
  );
  const wasRejected = restrictedMessages.length > 0;

  if (wasRejected !== probe.shouldReject) {
    failures.push(
      `${probe.filePath}: expected restricted=${probe.shouldReject}, received restricted=${wasRejected}`,
    );
  }
}

if (failures.length > 0) {
  console.error(['Import boundary verification failed:', ...failures].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Import boundary verification passed (${probes.length} probes).`);
}
