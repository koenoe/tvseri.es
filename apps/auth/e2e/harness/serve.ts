/**
 * Bundles the e2e harness like SST bundles the Lambda (everything in one
 * file, infra/auth.ts's loaders: `.css` as text, `.woff2` as bytes) and
 * serves it on `AUTH_E2E_PORT`.
 * Run by Playwright's webServer (playwright.config.ts); never deployed.
 */
import { createServer } from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '../..');
const port = Number(process.env.AUTH_E2E_PORT ?? 3193);
const origin = `http://localhost:${port}`;
const outfile = path.join(root, 'node_modules/.cache/auth-e2e/site.mjs');

await build({
  bundle: true,
  entryPoints: [path.join(root, 'e2e/harness/site.ts')],
  format: 'esm',
  loader: { '.css': 'text', '.woff2': 'binary' },
  outfile,
  platform: 'node',
  target: 'node24',
});

// The app reads the stage like the Lambda does; a non-production stage
// allows local callbacks.
process.env.SST_RESOURCE_App = JSON.stringify({
  name: 'tvseries',
  stage: 'e2e',
});

const { createHarness } = (await import(pathToFileURL(outfile).href)) as {
  createHarness: (origin: string) => {
    fetch: (req: Request) => Promise<Response>;
  };
};
const app = createHarness(origin);

createServer(async (req, res) => {
  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
      else if (Array.isArray(value))
        for (const v of value) headers.append(name, v);
    }
    const request = new Request(new URL(req.url ?? '/', origin), {
      body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
      duplex: 'half',
      headers,
      method: req.method,
    } as RequestInit);
    const response = await app.fetch(request);
    const out: [string, string][] = [];
    response.headers.forEach((value, name) => {
      if (name !== 'set-cookie') out.push([name, value]);
    });
    for (const cookie of response.headers.getSetCookie()) {
      out.push(['set-cookie', cookie]);
    }
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500).end('harness error');
  }
}).listen(port, () => console.log(`auth e2e harness on ${origin}`));
