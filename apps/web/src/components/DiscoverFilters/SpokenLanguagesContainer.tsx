import { fetchLanguages } from '@/lib/api';

import DiscoverSpokenLanguages from './SpokenLanguages';

export default async function DiscoverSpokenLanguagesContainer({
  className,
}: Readonly<{ className?: string }>) {
  const languages = await fetchLanguages();

  return (
    <DiscoverSpokenLanguages className={className} languages={languages} />
  );
}
