import { transform } from 'esbuild';

/**
 * Minifies the API Router's viewer-request function at deploy
 * (sst.config.ts): CloudFront Functions are limited to 10 KB, and SST ships
 * its part unminified. Whitespace, syntax and local names are minified;
 * es2017 keeps esbuild from introducing syntax the CloudFront runtime may
 * lack. esbuild renames the top-level function too, but CloudFront calls it
 * by name, so `handler` is put back. If the code isn't the expected shape
 * (the `cloudfront` import, then the handler) the deploy fails here rather
 * than shipping a function CloudFront can't call.
 * Its size is checked in apps/api/test/edgeFunction.test.ts.
 */
const SHAPE = /^(import [\w$]+ from"cloudfront";async function )([\w$]+)\(/;

export const minifyEdgeFunction = async (code: string) => {
  const { code: minified } = await transform(code, {
    loader: 'js',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    target: 'es2017',
  });
  if (!SHAPE.test(minified)) {
    throw new Error(
      'The API edge function no longer starts with the cloudfront import and its handler: check infra/edgeFunctionMinify.ts',
    );
  }
  return minified.replace(SHAPE, '$1handler(');
};
