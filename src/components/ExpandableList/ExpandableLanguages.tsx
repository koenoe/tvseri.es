'use client';

import { type TvSeries } from '@/types/tv-series';

import ExpandableList from './ExpandableList';

export default function ExpandableLanguages({
  languages,
}: Readonly<{ languages: TvSeries['languages'] }>) {
  return (
    <ExpandableList
      items={languages}
      label="Languages"
      initialDisplayCount={3}
      itemKey={(index) => languages[index].code}
      itemLabel={(index) => languages[index].englishName}
      itemHref={(index) =>
        `/discover?with_original_language=${languages[index].code}`
      }
    />
  );
}
