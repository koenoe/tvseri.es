import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import Page from '@/components/background/Page';

import { utcDay } from '../../_home/data/day';
import { plansFrom } from '../../_home/data/plan';
import HomeView from '../../_home/HomeView';
import DayBanner from './_parts/DayBanner';
import FeaturePreview from './_parts/FeaturePreview';
import PersonalPreview from './_parts/PersonalPreview';
import PickPremieresPreview from './_parts/PickPremieresPreview';
import RealKinds from './_parts/RealKinds';
import SpotlightPreview from './_parts/SpotlightPreview';
import ToyPreview from './_parts/ToyPreview';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Home parts',
};

type SearchParams = Promise<Readonly<{ day?: string | string[] }>>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Internal (next dev, and the e2e build that compiles in Next's testing API,
 * `EXPOSE_TESTING_API=1`; every other production build 404s):
 * - `/dev/home`: every rotating kind (the four features, the Countdown, the
 *   three toys, If you liked X) with the API's real data and images, each
 *   labelled with when it next appears and whether the API falls through
 *   then; below, the sample fixtures for side-by-side checks.
 * - `/dev/home?day=YYYY-MM-DD`: the whole Home page as it will be that day
 *   (the e2e specs pin each moment kind with it: `home-overflow.spec.ts`).
 */
export default function HomePartsPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.EXPOSE_TESTING_API !== '1'
  ) {
    notFound();
  }
  // the preview renders per request: hold a screen until it streams in, so
  // the footer isn't painted on the first screen and pushed away
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const { day } = await searchParams;
  if (typeof day === 'string' && DAY.test(day)) {
    return (
      <>
        <HomeView day={day} />
        <DayBanner day={day} />
      </>
    );
  }
  // a dev page of today's real data: rendered per request
  await connection();
  const today = utcDay(new Date());
  return (
    <Page backgroundColor="#212628">
      <div className="-mt-16 flex flex-col gap-16 bg-page pt-28 pb-16 md:-mt-20">
        <header className="mx-auto flex w-full max-w-page flex-col gap-3 px-gutter">
          <h1 className="text-title-1 text-white">Home, every kind</h1>
          <p className="text-body text-white/80">
            Real data for today ({today}) from the API, one kind at a time.{' '}
            <Link className="text-cyan underline" href="/dev/home/rules">
              How Home works, with the calendar
            </Link>
            .
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-white/60">
            Whole page on:
            {plansFrom(today, 8).map((plan) => (
              <Link
                className="underline"
                href={`/dev/home?day=${plan.day}`}
                key={plan.day}
              >
                {plan.day}
              </Link>
            ))}
          </p>
        </header>
        <RealKinds today={today} />
        <h2 className="mx-auto w-full max-w-page px-gutter text-title-1 text-white">
          Sample fixtures
        </h2>
        <SpotlightPreview />
        <PersonalPreview />
        <PickPremieresPreview />
        <FeaturePreview />
        <ToyPreview />
      </div>
    </Page>
  );
}
