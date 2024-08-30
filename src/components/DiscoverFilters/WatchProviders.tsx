'use client';

import { useCallback, useMemo } from 'react';

import { cva } from 'class-variance-authority';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { type WatchProvider } from '@/types/watch-provider';

const buttonStyles = cva(
  'relative aspect-square h-8 w-8 overflow-hidden rounded-md opacity-90',
  {
    variants: {
      state: {
        active: 'border-2 border-white',
        inactive: 'border-2 border-transparent',
      },
    },
    defaultVariants: {
      state: 'inactive',
    },
  },
);

function WatchProviderButton({
  provider,
  isActive = false,
  onClick,
}: Readonly<{
  provider: WatchProvider;
  isActive: boolean;
  onClick?: (provider: WatchProvider) => void;
}>) {
  return (
    <button
      title={provider.name}
      className={buttonStyles({ state: isActive ? 'active' : 'inactive' })}
      onClick={() => onClick?.(provider)}
    >
      <Image
        src={provider.logo}
        alt={provider.name}
        width={56}
        height={56}
        unoptimized
      />
    </button>
  );
}

export default function DiscoverWatchProviders({
  providers,
}: Readonly<{
  providers: WatchProvider[];
}>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedProviderIds = useMemo(() => {
    const searchParamsWithWatchProviders = searchParams.get(
      'with_watch_providers',
    );
    return searchParamsWithWatchProviders
      ? searchParamsWithWatchProviders.split('|').map(Number)
      : [];
  }, [searchParams]);

  const handleOnClick = useCallback(
    (provider: WatchProvider) => {
      const isActive = selectedProviderIds.includes(provider.id);
      const updatedProviderIds = isActive
        ? selectedProviderIds.filter((id) => id !== provider.id)
        : [...selectedProviderIds, provider.id];

      const params = new URLSearchParams(searchParams.toString());
      if (updatedProviderIds.length > 0) {
        params.set('with_watch_providers', updatedProviderIds.join('|'));
      } else {
        params.delete('with_watch_providers');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedProviderIds],
  );

  return (
    <div className="flex w-full flex-row flex-wrap items-center gap-1">
      {providers.map((provider) => (
        <WatchProviderButton
          key={provider.id}
          provider={provider}
          isActive={selectedProviderIds.includes(provider.id)}
          onClick={handleOnClick}
        />
      ))}
    </div>
  );
}
