'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import Image from 'next/image';
import { useCallback, useMemo } from 'react';

import MultiSelect, { type Result } from './MultiSelect';

export default function DiscoverWatchProviders({
  className,
  providers,
}: Readonly<{
  className?: string;
  providers: ReadonlyArray<Pick<WatchProvider, 'id' | 'logo' | 'name'>>;
}>) {
  const multiSelectValues = useMemo(
    () =>
      providers.map((provider) => ({
        label: provider.name,
        value: String(provider.id),
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
          alt={item.label}
          className="h-8 w-8 object-contain"
          height={32}
          src={logo as string}
          width={32}
        />
      );
    },
    [providers],
  );

  return (
    <MultiSelect
      className={className}
      classNameDropdown="grid grid-cols-8 gap-2"
      placeholder="Streaming service"
      renderSelectItem={renderSelectItem}
      results={multiSelectValues}
      searchParamKey="with_watch_providers"
      searchParamSeparator="|"
    />
  );
}
