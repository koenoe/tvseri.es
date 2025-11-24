'use client';

import type { CountryOrLanguage } from '@tvseri.es/schemas';
import Image from 'next/image';
import { useCallback, useMemo } from 'react';

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
        label: country.englishName,
        value: country.code,
      })),
    [countries],
  );

  const renderSelectItem = useCallback((item: Result) => {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="relative h-[20px] w-auto min-w-[20px]">
          <Image
            alt={item.label}
            className="object-contain"
            fill
            onError={(e) => {
              e.currentTarget.src = `data:image/svg+xml;base64,${svgSimplePlaceholder(30, 20)}`;
            }}
            placeholder={`data:image/svg+xml;base64,${svgSimplePlaceholder(30, 20)}`}
            src={`https://flagcdn.com/h20/${String(item.value).toLocaleLowerCase()}.webp`}
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
      placeholder="Country of origin"
      renderSelectItem={renderSelectItem}
      results={multiSelectValues}
      searchParamKey="with_origin_country"
      searchParamSeparator="|"
    />
  );
}
