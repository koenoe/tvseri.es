import 'server-only';

import { headers } from 'next/headers';

import {
  browserFactsFrom,
  browserSupport,
} from '@/lib/extension/browserSupport';
import { EXTENSION_VERSION } from '@/lib/extension/release';

import { EXTENSION_ZIP_HREF } from '../_lib/zip';
import ExtensionCtaClient from './ExtensionCtaClient';

/**
 * The page's only dynamic hole: the request's headers decide support, so a
 * phone paints Copy link at once.
 */
export default async function ExtensionCta() {
  const browser = browserSupport(browserFactsFrom(await headers()));
  return (
    <ExtensionCtaClient
      browser={browser}
      latest={EXTENSION_VERSION}
      zip={EXTENSION_ZIP_HREF}
    />
  );
}
