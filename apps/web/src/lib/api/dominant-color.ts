import { apiFetch } from './client';

export async function detectDominantColorFromImage({
  url,
}: Readonly<{
  url: string;
}>) {
  const response = await apiFetch<Readonly<{ hex: string }>>(
    '/dominant-color',
    {
      query: {
        url,
      },
    },
  );

  return response.hex;
}
