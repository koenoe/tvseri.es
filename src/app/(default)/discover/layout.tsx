import { Suspense } from 'react';

import DiscoverFilters from '@/components/DiscoverFilters';
import DiscoverCountriesContainer from '@/components/DiscoverFilters/CountriesContainer';
import DiscoverGenresContainer from '@/components/DiscoverFilters/GenresContainer';
import DiscoverKeywords from '@/components/DiscoverFilters/Keywords';
import DiscoverSpokenLanguagesContainer from '@/components/DiscoverFilters/SpokenLanguagesContainer';
import DiscoverWatchProvidersContainer from '@/components/DiscoverFilters/WatchProvidersContainer';
import SortBySelect from '@/components/Grid/SortBySelect';
import Page from '@/components/Page/Page';

const sortOptions = [
  {
    value: 'popularity.desc',
    label: 'Popularity',
  },
  {
    value: 'first_air_date.desc',
    label: 'Air date',
  },
  {
    value: 'vote_average.desc',
    label: 'Vote avg.',
  },
  {
    value: 'vote_count.desc',
    label: 'Vote count',
  },
];

export default async function DiscoverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Page backgroundContext="dots">
      <div className="container">
        <div className="relative z-40">
          <Suspense
            fallback={
              <div className="absolute left-0 top-0 z-10 h-11 w-36 animate-pulse rounded-3xl bg-white/5 backdrop-blur-xl" />
            }
          >
            <SortBySelect
              className="absolute left-0 top-0 z-10 h-11 w-36"
              options={sortOptions}
            />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="relative mb-10 ml-auto h-11 w-32 animate-pulse rounded-3xl bg-white/5 backdrop-blur-xl" />
          }
        >
          <DiscoverFilters className="relative z-30 mb-10 items-end">
            <div className="grid gap-7">
              <Suspense fallback={null}>
                <DiscoverGenresContainer />
              </Suspense>
            </div>
            <div className="grid gap-7">
              <Suspense fallback={null}>
                <DiscoverWatchProvidersContainer />
              </Suspense>
              <Suspense fallback={null}>
                <DiscoverKeywords />
              </Suspense>
            </div>
            <div className="grid gap-7">
              <Suspense fallback={null}>
                <DiscoverCountriesContainer />
              </Suspense>
              <Suspense fallback={null}>
                <DiscoverSpokenLanguagesContainer />
              </Suspense>
            </div>
          </DiscoverFilters>
        </Suspense>
        {children}
      </div>
    </Page>
  );
}
