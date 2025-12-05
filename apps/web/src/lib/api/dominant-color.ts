import { apiFetch } from './client';

export async function detectDominantColorFromImage({
  url,
  cacheKey,
}: Readonly<{
  url: string;
  cacheKey?: string;
}>) {
  const response = (await apiFetch('/dominant-color', {
    query: {
      cache_key: cacheKey,
      url,
    },
  })) as Readonly<{
    hex: string;
  }>;

  return response.hex;
}
