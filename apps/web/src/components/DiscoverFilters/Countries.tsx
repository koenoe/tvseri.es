'use client';

import { useCallback, useMemo } from 'react';

import { type CountryOrLanguage } from '@tvseri.es/types';
import Image from 'next/image';

import svgSimplePlaceholder from '@/utils/svgSimplePlaceholder';

import MultiSelect, { type Result } from './MultiSelect';

export default function DiscoverCountries({
  className,
  countries,
}: Readonly<{
  className?: string;
  countries: CountryOrLanguage[];
}>) {
  const multiSelectValues = useMemo(
    () =>
      countries.map((country) => ({
        value: country.code,
        label: country.englishName,
      })),
    [countries],
  );

  const renderSelectItem = useCallback((item: Result) => {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="relative h-[20px] w-auto min-w-[20px]">
          <Image
            className="object-contain"
            src={`https://flagcdn.com/h20/${String(item.value).toLocaleLowerCase()}.webp`}
            alt={item.label}
            placeholder={`data:image/svg+xml;base64,${svgSimplePlaceholder(30, 20)}`}
            onError={(e) => {
              e.currentTarget.src = `data:image/svg+xml;base64,${svgSimplePlaceholder(30, 20)}`;
            }}
            fill
            unoptimized
          />
        </div>
        {item.label}
      </div>
    );
  }, []);

  return (
    <MultiSelect
      className={className}
      classNameDropdown="flex flex-col gap-2"
      searchParamKey="with_origin_country"
      searchParamSeparator="|"
      results={multiSelectValues}
      placeholder="Country of origin"
      renderSelectItem={renderSelectItem}
    />
  );
}
