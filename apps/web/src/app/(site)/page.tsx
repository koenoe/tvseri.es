import type { Metadata } from 'next';

import { getHomeDay } from './_home/data/home';
import HomeView from './_home/HomeView';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/** Home: today's page (UTC; everything "of the day" turns over at midnight) */
export default async function HomePage() {
  const day = await getHomeDay();
  return <HomeView day={day} />;
}
