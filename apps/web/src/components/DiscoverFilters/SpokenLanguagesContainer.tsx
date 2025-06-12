import { fetchLanguages } from '@/lib/tmdb';

import DiscoverSpokenLanguages from './SpokenLanguages';

export default async function DiscoverSpokenLanguagesContainer({
  className,
}: Readonly<{ className?: string }>) {
  const languages = await fetchLanguages();

  return (
    <DiscoverSpokenLanguages languages={languages} className={className} />
  );
}
