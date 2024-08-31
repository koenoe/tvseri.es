'use client';

import { useCallback, useMemo } from 'react';

import { type CountryOrLanguage } from '@/types/country-language';

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
        value: country.code,
        label: country.englishName,
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
      searchParamKey="with_original_language"
      searchParamSeparator="|"
      results={multiSelectValues}
      placeholder="Spoken language"
      renderSelectItem={renderSelectItem}
    />
  );
}
