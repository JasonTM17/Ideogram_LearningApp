import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const appsRoot = path.join(projectRoot, 'apps');
const mobileRoot = path.join(appsRoot, 'mobile');
const nodeBuiltIns = new Set(builtinModules.map((moduleName) => moduleName.replace(/^node:/, '')));
const appPackageNames = new Set(
  readdirSync(appsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(appsRoot, entry.name, 'package.json');
      return JSON.parse(readFileSync(manifestPath, 'utf8')).name;
    }),
);

const isWithin = (candidatePath, rootPath) => {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== '..' &&
      !path.isAbsolute(relativePath))
  );
};

const isPackageImport = (specifier, packageName) =>
  specifier === packageName || specifier.startsWith(`${packageName}/`);

const isNodeBuiltIn = (specifier) => {
  const normalizedSpecifier = specifier.replace(/^node:/, '');
  return nodeBuiltIns.has(normalizedSpecifier);
};

const isUrlModuleSpecifier = (specifier) => /^[a-z][a-z\d+.-]*:/iu.test(specifier);

const isSharedPlatformImport = (specifier) =>
  ['react', 'react-dom', 'react-native', 'react-native-web', 'next'].some((packageName) =>
    isPackageImport(specifier, packageName),
  ) ||
  specifier === 'server-only' ||
  specifier === 'expo' ||
  specifier.startsWith('expo-') ||
  specifier.startsWith('@expo/');

const isNextServerOnlyImport = (specifier) =>
  ['next/after', 'next/cache', 'next/headers', 'next/server'].some(
    (entryPoint) => specifier === entryPoint || specifier.startsWith(entryPoint + '/'),
  ) || specifier.startsWith('next/dist/server/');

const resolveRelativeImport = (filename, specifier) => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const pathOnlySpecifier = specifier.replace(/[?#].*$/, '');
  return path.resolve(path.dirname(filename), pathOnlySpecifier);
};

const restrictionReason = (target, filename, specifier) => {
  if (isNodeBuiltIn(specifier)) {
    return 'Node.js built-ins are server-only';
  }

  if (isUrlModuleSpecifier(specifier)) {
    return 'URL-based module specifiers are not allowed across runtime boundaries';
  }

  const importedAppPackage = [...appPackageNames].find((packageName) =>
    isPackageImport(specifier, packageName),
  );
  const resolvedRelativeImport = resolveRelativeImport(filename, specifier);

  if (target === 'mobile') {
    if (
      specifier === 'server-only' ||
      isPackageImport(specifier, 'next') ||
      (importedAppPackage && importedAppPackage !== '@ideogram/mobile')
    ) {
      return 'mobile cannot import a server or sibling application runtime';
    }

    if (
      resolvedRelativeImport &&
      isWithin(resolvedRelativeImport, appsRoot) &&
      !isWithin(resolvedRelativeImport, mobileRoot)
    ) {
      return 'mobile cannot bypass app boundaries with a relative path';
    }
  }

  if (target === 'shared') {
    if (isSharedPlatformImport(specifier)) {
      return 'shared packages must remain platform-neutral';
    }

    if (importedAppPackage) {
      return 'shared packages cannot depend on an application runtime';
    }

    if (resolvedRelativeImport && isWithin(resolvedRelativeImport, appsRoot)) {
      return 'shared packages cannot bypass app boundaries with a relative path';
    }
  }

  if (target === 'web-client') {
    if (
      specifier === 'server-only' ||
      isNextServerOnlyImport(specifier) ||
      (importedAppPackage && importedAppPackage !== '@ideogram/web')
    ) {
      return 'web client modules cannot import server-only or sibling application runtimes';
    }

    if (
      resolvedRelativeImport &&
      isWithin(resolvedRelativeImport, appsRoot) &&
      !isWithin(resolvedRelativeImport, path.join(appsRoot, 'web'))
    ) {
      return 'web client modules cannot bypass app boundaries with a relative path';
    }
  }

  return null;
};

const staticSpecifier = (sourceNode) => {
  if (sourceNode?.type === 'Literal' && typeof sourceNode.value === 'string') {
    return sourceNode.value;
  }

  if (sourceNode?.type === 'TemplateLiteral' && sourceNode.expressions.length === 0) {
    return sourceNode.quasis[0]?.value.cooked ?? null;
  }

  return null;
};

const staticMemberPropertyName = (memberExpression) => {
  if (memberExpression.computed) {
    return staticSpecifier(memberExpression.property);
  }

  return memberExpression.property.type === 'Identifier' ? memberExpression.property.name : null;
};

const commonJsLoaderName = (callee) => {
  if (callee.type === 'Identifier' && callee.name === 'require') {
    return 'require';
  }

  if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') {
    return null;
  }

  const propertyName = staticMemberPropertyName(callee);
  if (callee.object.name === 'require' && propertyName === 'resolve') {
    return 'require.resolve';
  }

  if (
    callee.object.name === 'module' &&
    (propertyName === 'createRequire' || propertyName === 'require')
  ) {
    return 'module.' + propertyName;
  }

  return null;
};

const nodeRuntimeLoaderName = (callee) => {
  if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') {
    return null;
  }

  return callee.object.name === 'process' && staticMemberPropertyName(callee) === 'getBuiltinModule'
    ? 'process.getBuiltinModule'
    : null;
};

const importBoundariesRule = {
  meta: {
    docs: {
      description:
        'Keep mobile, shared packages, and web client modules within runtime boundaries.',
    },
    messages: {
      cjsLoader: 'CommonJS module loader APIs are not allowed in mobile or shared packages.',
      nodeRuntimeLoader:
        'Node.js runtime module loader APIs are not allowed in mobile or shared packages.',
      nonStaticRuntimeImport:
        'Non-static runtime imports are not allowed in mobile or shared packages.',
      restricted: "Import '{{specifier}}' is restricted: {{reason}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          target: {
            enum: ['mobile', 'shared', 'web-client'],
          },
        },
        required: ['target'],
        type: 'object',
      },
    ],
    type: 'problem',
  },
  create(context) {
    const target = context.options[0].target;
    let shouldEnforce = target !== 'web-client';

    const inspectImport = (sourceNode, rejectNonStaticRuntimeImport = false) => {
      if (!shouldEnforce) {
        return;
      }

      const specifier = staticSpecifier(sourceNode);

      if (!specifier) {
        if (rejectNonStaticRuntimeImport) {
          context.report({
            messageId: 'nonStaticRuntimeImport',
            node: sourceNode,
          });
        }
        return;
      }

      const reason = restrictionReason(target, context.filename, specifier);

      if (reason) {
        context.report({
          data: { reason, specifier },
          messageId: 'restricted',
          node: sourceNode,
        });
      }
    };

    return {
      CallExpression(node) {
        if (!shouldEnforce) {
          return;
        }

        if (commonJsLoaderName(node.callee)) {
          context.report({
            messageId: 'cjsLoader',
            node: node.callee,
          });
        }

        if (nodeRuntimeLoaderName(node.callee)) {
          context.report({
            messageId: 'nodeRuntimeLoader',
            node: node.callee,
          });
        }
      },
      ExportAllDeclaration: (node) => inspectImport(node.source),
      ExportNamedDeclaration: (node) => inspectImport(node.source),
      ImportDeclaration: (node) => inspectImport(node.source),
      ImportExpression: (node) => inspectImport(node.source, true),
      Program(node) {
        if (target === 'web-client') {
          shouldEnforce = node.body.some(
            (statement) =>
              statement.type === 'ExpressionStatement' && statement.directive === 'use client',
          );
        }
      },
    };
  },
};

export default {
  rules: {
    'import-boundaries': importBoundariesRule,
  },
};
