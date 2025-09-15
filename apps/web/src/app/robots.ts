import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
export const revalidate = 86400;

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/refs/heads/main/robots.json',
      {
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch robots.json: ${response.status}`);
    }

    const data = await response.json();
    const rules: MetadataRoute.Robots['rules'] = [
      {
        disallow: '/',
        userAgent: Object.keys(data),
      },
    ];

    return {
      rules,
    };
  } catch (error) {
    console.error('Error fetching robots.json:', error);
    throw error;
  }
}
