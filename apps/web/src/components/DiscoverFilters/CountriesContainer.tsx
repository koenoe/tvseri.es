import { fetchCountries } from '@/lib/tmdb';

import DiscoverCountries from './Countries';

export default async function DiscoverCountriesContainer({
  className,
}: Readonly<{ className?: string }>) {
  const countries = await fetchCountries();

  return <DiscoverCountries countries={countries} className={className} />;
}
