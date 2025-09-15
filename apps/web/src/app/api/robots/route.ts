export async function GET() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/refs/heads/main/robots.txt',
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch robots.txt: ${response.status}`);
    }

    const robotsTxt = await response.text();

    return new Response(robotsTxt, {
      headers: {
        'Cache-Control':
          'public,max-age=0,s-maxage=86400,stale-while-revalidate=86400',
        'Content-Type': 'text/plain',
      },
      status: 200,
    });
  } catch (_error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
