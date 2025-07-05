'use client';

import type { WatchProvider } from '@tvseri.es/types';
import Image from 'next/image';
import { useCallback } from 'react';
import SwitchButton from '../Buttons/SwitchButton';

export default function StreamingService({
  isSelected = false,
  provider,
  onSelect,
}: Readonly<{
  provider: WatchProvider;
  isSelected?: boolean;
  onSelect?: (provider: WatchProvider, isSelected: boolean) => void;
}>) {
  const handleOnChange = useCallback(
    (checked: boolean) => {
      onSelect?.(provider, checked);
    },
    [onSelect, provider],
  );

  const handleRowClick = useCallback(() => {
    onSelect?.(provider, !isSelected);
  }, [onSelect, provider, isSelected]);

  return (
    <div
      className="relative flex flex-row gap-4 rounded-lg bg-black/10 p-4 items-center cursor-pointer"
      key={provider.id}
      onClick={handleRowClick}
    >
      <div className="relative aspect-square size-8 md:size-10 overflow-hidden rounded-md shrink-0">
        <Image
          alt={provider.name}
          height={56}
          src={provider.logo}
          unoptimized
          width={56}
        />
      </div>
      <span className="text-sm leading-relaxed">{provider.name}</span>
      <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
        <SwitchButton isChecked={isSelected} onChange={handleOnChange} />
      </div>
    </div>
  );
}
