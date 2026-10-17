/**
 * Dashboard read-only admin routes are called with a Bearer token instead of the
 * API key. Shared by the CloudFront viewer-request function (infra/api.ts) and
 * the Lambda middleware (apps/api/src/middleware/apiKey.ts) so they can't drift.
 * Regex sources are strings because the edge function is built from them.
 */
export const DASHBOARD_READ = {
  // No dot segments
  dotSegmentSource: '\\.\\.|%2e',
  methods: ['GET', 'HEAD'],
  pathSource:
    '^\\/metrics\\/(api|web-vitals\\/(summary|routes|countries|devices))(\\/|$)',
} as const;
