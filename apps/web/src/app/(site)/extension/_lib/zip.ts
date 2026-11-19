import { EXTENSION_VERSION, extensionZipName } from '@/lib/extension/release';

/** Served from `public/`, built before every web build */
export const EXTENSION_ZIP_HREF = `/${extensionZipName(EXTENSION_VERSION)}`;
