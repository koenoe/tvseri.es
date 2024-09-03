'use client';

import { useCallback, useMemo } from 'react';

import Image from 'next/image';

import { type CountryOrLanguage } from '@/types/country-language';

import MultiSelect, { type Result } from './MultiSelect';

const svgBase64FlagPlaceholder = (width: number, height: number) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" version="1.1">
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.1)" />
    </svg>
  `;
  return btoa(svg);
};

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
            placeholder={`data:image/svg+xml;base64,${svgBase64FlagPlaceholder(30, 20)}`}
            onError={(e) => {
              e.currentTarget.src = `data:image/svg+xml;base64,${svgBase64FlagPlaceholder(30, 20)}`;
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
