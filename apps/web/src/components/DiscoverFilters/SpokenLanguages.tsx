'use client';

import type { CountryOrLanguage } from '@tvseri.es/types';
import { useCallback, useMemo } from 'react';

import MultiSelect, { type Result } from './MultiSelect';

export default function DiscoverSpokenLanguages({
  className,
  languages,
}: Readonly<{
  className?: string;
  languages: CountryOrLanguage[];
}>) {
  const multiSelectValues = useMemo(
    () =>
      languages.map((country) => ({
        label: country.englishName,
        value: country.code,
      })),
    [languages],
  );

  const renderSelectItem = useCallback((item: Result) => {
    return <div className="text-sm">{item.label}</div>;
  }, []);

  return (
    <MultiSelect
      className={className}
      classNameDropdown="flex flex-col gap-2"
      placeholder="Spoken language"
      renderSelectItem={renderSelectItem}
      results={multiSelectValues}
      searchParamKey="with_original_language"
      searchParamSeparator="|"
    />
  );
}
