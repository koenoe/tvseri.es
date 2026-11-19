import { headers } from 'next/headers';

import {
  browserFactsFrom,
  browserSupport,
} from '@/lib/extension/browserSupport';

import ExtensionStatusLine from './ExtensionStatusLine';

/**
 * The extension's status line, in its own hole: whether this browser can
 * run it at all is the server's call from the request's headers, so an
 * unsupported browser paints its line from the first frame.
 */
export default async function ExtensionStatus() {
  const browser = browserSupport(browserFactsFrom(await headers()));
  return <ExtensionStatusLine browser={browser} />;
}
