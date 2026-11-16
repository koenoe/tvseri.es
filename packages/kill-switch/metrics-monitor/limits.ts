/**
 * Month-to-date limits, summed over every CloudFront distribution and
 * function in the account; reaching one disables every distribution.
 * Requests and function invocations are 40M, so a busy month doesn't take
 * the site down at the free tier's 10M. The API Router's viewer-request
 * function runs on every API request, so the two move together.
 */
export const LIMITS = {
  BytesDownloaded: 1_000_000_000_000, // 1 TB, the free tier
  FunctionInvocations: 40_000_000,
  Requests: 40_000_000,
} as const;
