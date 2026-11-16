import { readFileSync } from 'node:fs';

import { buildApiEdgeInjection } from '../../../infra/apiEdgeInjection';
import { minifyEdgeFunction } from '../../../infra/edgeFunctionMinify';

/**
 * Builds the API Router's viewer-request function the way a deploy does:
 * SST's Router template (from the installed SST, `.sst/platform`), with our
 * injection, SST's block of the CloudFront default domain and its routing
 * code, then our deploy-time minifier (sst.config.ts). When an SST upgrade
 * changes the template's shape this throws, so the size check is redone by
 * hand rather than skipped.
 */

const ROUTER_SOURCE = new URL(
  '../../../.sst/platform/src/components/aws/router.ts',
  import.meta.url,
);

const CHANGED = 'SST’s Router function template changed shape';

/** The raw text of the template literal that follows `marker` */
const templateAfter = (source: string, marker: string) => {
  const at = source.indexOf(marker);
  const start = source.indexOf('`', at) + 1;
  const end = source.indexOf('`', start);
  if (at < 0 || start === 0 || end < 0) {
    throw new Error(`${CHANGED}: ${marker}`);
  }
  return source.slice(start, end);
};

/** `${name}` as it appears in SST's source */
const slot = (name: string) => `$\{${name}}`;

/** A template literal's value, as JavaScript cooks it */
const cook = (raw: string) => new Function(`return \`${raw}\`;`)() as string;

export const buildRouterFunction = async (apiKey: string) => {
  const source = readFileSync(ROUTER_SOURCE, 'utf8');
  const headerLimit =
    /const CLOUDFRONT_FUNCTION_SAFE_HEADER_LIMIT = ([\d\s+*-]+);/
      .exec(source)?.[1]
      ?.trim();
  if (!headerLimit) {
    throw new Error(`${CHANGED}: CLOUDFRONT_FUNCTION_SAFE_HEADER_LIMIT`);
  }

  const block = cook(
    templateAfter(source, 'export const CF_BLOCK_CLOUDFRONT_URL_INJECTION ='),
  );
  // `minify` is a String.raw that esbuild-minifies; the final minify covers it
  const router = templateAfter(
    source,
    'export const CF_ROUTER_INJECTION = minify',
  ).replaceAll(
    slot('CLOUDFRONT_FUNCTION_SAFE_HEADER_LIMIT'),
    String(new Function(`return ${headerLimit};`)()),
  );

  const values: Readonly<Record<string, string>> = {
    __BLOCK__: block,
    __INJECTION__: buildApiEdgeInjection(apiKey),
    __NAMESPACE__: 'abcd',
    __ROUTER__: router,
  };
  const template = templateAfter(
    source,
    'code: interpolate`\nimport cf from "cloudfront";',
  )
    .replace(slot('userInjection'), '__INJECTION__')
    .replace(slot('blockCloudfrontUrlInjection'), '__BLOCK__')
    .replace(slot('CF_ROUTER_INJECTION'), '__ROUTER__')
    .replace(slot('kvNamespace'), '__NAMESPACE__')
    .replace(/\$\{\s*\/\*[\s\S]*?\*\/\s*""\s*\}/g, '');
  if (/\$\{/.test(template)) {
    throw new Error(`${CHANGED}: unknown placeholder`);
  }

  const code = cook(template).replace(
    /__(INJECTION|BLOCK|ROUTER|NAMESPACE)__/g,
    (token) => values[token] ?? token,
  );
  return minifyEdgeFunction(code);
};
