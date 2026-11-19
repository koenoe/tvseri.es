import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAst } from 'vitest/node';

/**
 * A Lambda can only read the resources linked to it in infra: SST throws
 * "not linked" at runtime otherwise, which no type check catches. This reads
 * every function's handler and `link` from infra/, walks the handler's
 * imports (what its bundle can run) and checks each `Resource.X` against
 * those links.
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const INFRA = join(ROOT, 'infra');

// SST gives every function the app's name and stage
const ALWAYS_LINKED = new Set(['App']);

const lambda = (name: string) => `apps/api/src/lambdas/${name}.handler`;

/**
 * Reads in a function's import graph that it never runs, so infra leaves them
 * unlinked (a link is an IAM grant as well as a value). Checked by hand: the
 * graph is per module, not per call. Safe only because no module reads at
 * import (src/noResourceAtImport.test.ts).
 */
const NOT_RUN: ReadonlyArray<
  Readonly<{
    handlers: ReadonlyArray<string>;
    resources: ReadonlyArray<string>;
  }>
> = [
  // Only the API functions call MDBList; the rest reach it through the TMDB
  // module's imports (mdblistLink.test.ts runs them without the link)
  {
    handlers: [
      lambda('connectionSync'),
      lambda('scrobble'),
      lambda('validateWatchedStatusQueue'),
      lambda('watched'),
    ],
    resources: ['MdblistApiKey'],
  },
  // Takes cache keys from lib/profileCounters, whose watched-store imports
  // load the catalogue; deleting never fetches a show
  {
    handlers: [lambda('deleteAccount')],
    resources: [
      'DominantColor',
      'MdblistApiKey',
      'PreferredImages',
      'TmdbApiAccessToken',
      'TmdbApiKey',
    ],
  },
  // Reads episode keys from the watched store, whose imports load the
  // catalogue; undoing only queries and deletes watched items and prefs
  {
    handlers: [lambda('undoImport')],
    resources: [
      'Cache',
      'DominantColor',
      'MdblistApiKey',
      'PreferredImages',
      'TmdbApiAccessToken',
      'TmdbApiKey',
    ],
  },
];

const notRun = new Set(
  NOT_RUN.flatMap(({ handlers, resources }) =>
    handlers.flatMap((handler) =>
      resources.map((resource) => `${handler} ${resource}`),
    ),
  ),
);

type Node = Readonly<{ type: string; [field: string]: unknown }>;

type LambdaFunction = Readonly<{
  entry: string;
  handler: string;
  links: ReadonlySet<string>;
}>;

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string';

const walk = (
  node: Node,
  visit: (node: Node, parent: Node | undefined) => void,
  parent?: Node,
) => {
  visit(node, parent);
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (isNode(child)) {
        walk(child, visit, node);
      }
    }
  }
};

const parse = (path: string): Node =>
  parseAst(readFileSync(path, 'utf8'), {
    lang: path.endsWith('.tsx') ? 'tsx' : path.endsWith('.ts') ? 'ts' : 'js',
  }) as unknown as Node;

const child = (node: Node, field: string) => {
  const value = node[field];
  return isNode(value) ? value : undefined;
};

const stringValue = (node: Node | undefined) =>
  node?.type === 'Literal' && typeof node.value === 'string'
    ? node.value
    : undefined;

const identifierName = (node: Node | undefined) =>
  node?.type === 'Identifier' && typeof node.name === 'string'
    ? node.name
    : undefined;

const infraFiles = readdirSync(INFRA, { recursive: true })
  .map((path) => join(INFRA, String(path)))
  .filter((path) => path.endsWith('.ts'));

/** `const cache = new sst.aws.Dynamo('Cache', …)`: `cache` → `Cache` */
const componentNames = () => {
  const names = new Map<string, string>();
  for (const path of infraFiles) {
    walk(parse(path), (node) => {
      const init = child(node, 'init');
      const variable = identifierName(child(node, 'id'));
      if (
        node.type !== 'VariableDeclarator' ||
        init?.type !== 'NewExpression'
      ) {
        return;
      }
      const [first] = init.arguments as Node[];
      const name = stringValue(first);
      if (!variable || !name) {
        return;
      }
      const known = names.get(variable);
      if (known && known !== name) {
        throw new Error(
          `infra declares ${variable} as both ${known} and ${name}`,
        );
      }
      names.set(variable, name);
    });
  }
  return names;
};

const property = (object: Node, name: string) =>
  (object.properties as Node[])
    .filter((prop) => prop.type === 'Property')
    .find((prop) => identifierName(child(prop, 'key')) === name)?.value as
    | Node
    | undefined;

const handlerEntry = (handler: string) => {
  const base = join(ROOT, handler.slice(0, handler.lastIndexOf('.')));
  const entry = ['.ts', '.tsx', '.mjs', '.js']
    .map((extension) => `${base}${extension}`)
    .find((path) => existsSync(path));
  if (!entry) {
    throw new Error(`no file for handler ${handler}`);
  }
  return entry;
};

/** Every object literal in infra with a `handler`: a Lambda's arguments */
const lambdaFunctions = (): ReadonlyArray<LambdaFunction> => {
  const names = componentNames();
  const functions: LambdaFunction[] = [];
  for (const path of infraFiles) {
    walk(parse(path), (node, parent) => {
      // SST also takes a bare handler string, which would have no link list
      if (
        stringValue(node)?.endsWith('.handler') &&
        identifierName(parent && child(parent, 'key')) !== 'handler'
      ) {
        throw new Error(`${path}: a handler outside a function's arguments`);
      }
      if (node.type !== 'ObjectExpression') {
        return;
      }
      const handlerNode = property(node, 'handler');
      if (!handlerNode) {
        return;
      }
      const handler = stringValue(handlerNode);
      if (!handler) {
        throw new Error(`${path}: a handler that isn't a string literal`);
      }
      const link = property(node, 'link');
      if (link && link.type !== 'ArrayExpression') {
        throw new Error(`${handler}: link isn't an array literal`);
      }
      const links = ((link?.elements ?? []) as Node[]).map((element) => {
        const variable =
          element.type === 'MemberExpression' && !element.computed
            ? identifierName(child(element, 'property'))
            : identifierName(element);
        const name = variable && names.get(variable);
        if (!name) {
          throw new Error(`${handler}: can't tell which component a link is`);
        }
        return name;
      });
      functions.push({
        entry: handlerEntry(handler),
        handler,
        links: new Set(links),
      });
    });
  }
  return functions;
};

/** Specifiers of the imports that survive bundling (types are erased) */
const runtimeImports = (path: string, program: Node) => {
  const specifiers: string[] = [];
  walk(program, (node) => {
    const source = stringValue(child(node, 'source'));
    if (node.type === 'ImportDeclaration') {
      const specifiersOf = node.specifiers as Node[];
      const typeOnly =
        node.importKind === 'type' ||
        (specifiersOf.length > 0 &&
          specifiersOf.every((specifier) => specifier.importKind === 'type'));
      if (!typeOnly && source) {
        specifiers.push(source);
      }
    } else if (
      (node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportAllDeclaration') &&
      node.exportKind !== 'type' &&
      source
    ) {
      specifiers.push(source);
    } else if (node.type === 'ImportExpression') {
      if (!source) {
        throw new Error(`${path}: dynamic import of a computed path`);
      }
      specifiers.push(source);
    }
  });
  return specifiers;
};

/** The package a file belongs to: its `@/` is `<package>/src` */
const packageRoot = (path: string): string => {
  const dir = dirname(path);
  return existsSync(join(dir, 'package.json')) ? dir : packageRoot(dir);
};

const WORKSPACE_PACKAGE = /^@tvseri\.es\/([\w-]+)$/;

/** The repo file an import runs, or null for a dependency or an asset */
const resolveImport = (from: string, specifier: string) => {
  const workspacePackage = WORKSPACE_PACKAGE.exec(specifier)?.[1];
  if (specifier.startsWith('@tvseri.es/') && !workspacePackage) {
    throw new Error(`${relative(ROOT, from)}: subpath import ${specifier}`);
  }
  const base = specifier.startsWith('@/')
    ? join(packageRoot(from), 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : workspacePackage
        ? join(ROOT, 'packages', workspacePackage)
        : null;
  if (!base) {
    return null;
  }
  const main = workspacePackage
    ? (
        JSON.parse(readFileSync(join(base, 'package.json'), 'utf8')) as {
          main?: string;
        }
      ).main
    : undefined;
  const candidates = main
    ? [join(base, main)]
    : [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base];
  const file = candidates.find(
    (path) => existsSync(path) && /\.(ts|tsx|mjs|js)$/.test(path),
  );
  if (file) {
    return file;
  }
  // Assets the bundler loads (the auth pages' CSS and font)
  if (existsSync(base)) {
    return null;
  }
  throw new Error(`${relative(ROOT, from)}: can't resolve ${specifier}`);
};

/** `Resource.X` → X; any other use of `Resource` could hide a read */
const resourceReads = (path: string, program: Node) => {
  const reads: string[] = [];
  walk(program, (node, parent) => {
    if (identifierName(node) !== 'Resource' || !parent) {
      return;
    }
    const read =
      parent.type === 'MemberExpression' &&
      parent.object === node &&
      !parent.computed
        ? identifierName(child(parent, 'property'))
        : undefined;
    if (read) {
      reads.push(read);
    } else if (parent.type !== 'ImportSpecifier') {
      throw new Error(
        `${relative(ROOT, path)}: Resource used but not as Resource.X`,
      );
    }
  });
  return reads;
};

/**
 * Every resource read in the handler's import graph, with the import chain
 * to the first file reading it
 */
const readsFrom = (entry: string) => {
  const reads = new Map<string, ReadonlyArray<string>>();
  const seen = new Set<string>();
  const visit = (path: string, chain: ReadonlyArray<string>) => {
    if (seen.has(path) || /\.test\.tsx?$/.test(path)) {
      return;
    }
    seen.add(path);
    const here = [...chain, relative(ROOT, path)];
    const program = parse(path);
    for (const name of resourceReads(path, program)) {
      if (!reads.has(name)) {
        reads.set(name, here);
      }
    }
    for (const specifier of runtimeImports(path, program)) {
      const next = resolveImport(path, specifier);
      if (next) {
        visit(next, here);
      }
    }
  };
  visit(entry, []);
  return reads;
};

const functions = lambdaFunctions();

describe('Lambda links', () => {
  it('cover every resource the function can read', () => {
    const unlinked: string[] = [];
    const unused = new Set(notRun);
    for (const { entry, handler, links } of functions) {
      for (const [resource, chain] of readsFrom(entry)) {
        unused.delete(`${handler} ${resource}`);
        if (
          links.has(resource) ||
          ALWAYS_LINKED.has(resource) ||
          notRun.has(`${handler} ${resource}`)
        ) {
          continue;
        }
        unlinked.push(
          `${handler} reads ${resource} unlinked, via ${chain.join(' > ')}`,
        );
      }
    }

    expect(functions.length).toBeGreaterThanOrEqual(14);
    expect(unlinked).toEqual([]);
    // An entry the graph no longer needs would hide a future read
    expect([...unused]).toEqual([]);
    // Walks every function's import graph: seconds when the machine is busy
    // (a full `pnpm test`), past the 5s default
  }, 30_000);

  // A link is a permission as well as a value: the API keeps only the ones
  // its code reads (another Lambda that needs a resource links it itself)
  it('give the API no email and no raw metrics table', () => {
    const api = functions.find(
      ({ handler }) => handler === 'apps/api/src/index.handler',
    );
    expect(api).toBeDefined();
    const reads = readsFrom(api!.entry);
    expect(reads.has('Users')).toBe(true);
    for (const resource of ['Email', 'MetricsRaw']) {
      expect(reads.has(resource)).toBe(false);
      expect(api!.links.has(resource)).toBe(false);
    }
  });
});
