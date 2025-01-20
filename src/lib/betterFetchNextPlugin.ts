import { type BetterFetchPlugin } from '@better-fetch/fetch';

const nextPlugin = {
  id: 'next-plugin',
  name: 'NextJS Plugin',
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
      url,
      options: patchedOptions,
    };
  },
} satisfies BetterFetchPlugin;

export default nextPlugin;
