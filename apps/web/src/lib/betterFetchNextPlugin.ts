import type { BetterFetchPlugin } from '@better-fetch/fetch';

const nextPlugin = {
  id: 'next-plugin',
  init: async (url, options) => {
    // Note: NextJS doesn't allow both revalidate + cache headers
    const next = options?.cache ? {} : options?.next;

    const patchedOptions = {
      ...options,
      next: {
        ...next,
        ...options?.next,
      },
    };
    return {
      options: patchedOptions,
      url,
    };
  },
  name: 'NextJS Plugin',
} satisfies BetterFetchPlugin;

export default nextPlugin;
