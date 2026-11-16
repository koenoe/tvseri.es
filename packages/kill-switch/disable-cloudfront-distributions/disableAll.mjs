/**
 * Disables every CloudFront distribution in the account; already disabled
 * ones are skipped. Each is tried even when another fails, then any failure
 * is thrown (so the invocation errors and Lambda's async retries run again;
 * the skip makes a retry safe).
 *
 * @param {{
 *   listDistributionIds: () => Promise<string[]>,
 *   getConfig: (id: string) => Promise<{ config: { Enabled?: boolean }, etag: string }>,
 *   updateConfig: (id: string, config: Record<string, unknown>, etag: string) => Promise<void>,
 * }} deps
 */
export const disableAll = async (deps) => {
  const ids = await deps.listDistributionIds();
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const { config, etag } = await deps.getConfig(id);
      if (!config.Enabled) {
        console.log(`Distribution ${id} is already disabled`);
        return;
      }
      await deps.updateConfig(id, { ...config, Enabled: false }, etag);
      console.log(`Disabled distribution ${id}`);
    }),
  );
  const failed = ids.filter((_, i) => results[i].status === 'rejected');
  if (failed.length > 0) {
    throw new AggregateError(
      results.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      ),
      `Could not disable ${failed.length} of ${ids.length} distributions: ${failed.join(', ')}`,
    );
  }
};
