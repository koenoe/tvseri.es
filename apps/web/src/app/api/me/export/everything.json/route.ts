import type { NextRequest } from 'next/server';

import { forwardExport } from '../forward';

/** Profile, history, lists and more as one JSON file (Your data). */
export function GET(req: NextRequest) {
  return forwardExport(req, 'everything.json');
}
