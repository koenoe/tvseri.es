'use client';

import { useCallback, useMemo } from 'react';

import { type WatchProvider } from '@tvseri.es/types';
import Image from 'next/image';

import MultiSelect, { type Result } from './MultiSelect';

export default function DiscoverWatchProviders({
  className,
  providers,
}: Readonly<{
  className?: string;
  providers: WatchProvider[];
}>) {
  const multiSelectValues = useMemo(
    () =>
      providers.map((provider) => ({
        value: String(provider.id),
        label: provider.name,
      })),
    [providers],
  );

  const renderSelectItem = useCallback(
    (item: Result) => {
      const logo = providers.find(
        (provider) => String(provider.id) === item.value,
      )?.logo;

      return (
        <Image
          className="h-8 w-8 object-contain"
          src={logo as string}
          alt={item.label}
          width={56}
          height={56}
          unoptimized
        />
      );
    },
    [providers],
  );

  return (
    <MultiSelect
      className={className}
      classNameDropdown="grid grid-cols-8 gap-2"
      searchParamKey="with_watch_providers"
      searchParamSeparator="|"
      results={multiSelectValues}
      placeholder="Streaming service"
      renderSelectItem={renderSelectItem}
    />
  );
}
