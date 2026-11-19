import manifest from '../../../../extension/manifest.json' with {
  type: 'json',
};

/**
 * The version /extension offers and compares an installed build with.
 * Server-only: client islands get it as a prop, so the manifest never ships.
 */
export const EXTENSION_VERSION: string = manifest.version;

/** Built into `public/` by `scripts/extension-zip.ts` */
export const extensionZipName = (version: string) =>
  `tvseries-extension-${version}.zip`;
