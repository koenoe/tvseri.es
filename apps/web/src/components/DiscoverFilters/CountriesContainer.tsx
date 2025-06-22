import { fetchCountries } from '@/lib/api';

import DiscoverCountries from './Countries';

export default async function DiscoverCountriesContainer({
  className,
}: Readonly<{ className?: string }>) {
  const countries = await fetchCountries();

  return <DiscoverCountries countries={countries} className={className} />;
}
