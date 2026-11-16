import type { NextRequest } from 'next/server';

import { forwardExport } from '../forward';

/** The watch history as a CSV in the importer's columns (Your data). */
export function GET(req: NextRequest) {
  return forwardExport(req, 'history.csv');
}
