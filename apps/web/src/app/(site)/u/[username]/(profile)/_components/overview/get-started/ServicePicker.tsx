'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import Link from 'next/link';
import { useCallback } from 'react';
import { checkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import ServiceIcon, {
  type ServiceIconLayout,
} from '@/components/ui/service/ServiceIcon';
import cn from '@/lib/cn';
import { PILL_ROW } from './layout';

/** Each place keeps its own look on purpose; don't unify them. */
const LOGO: ServiceIconLayout = { className: 'rounded-[5px]', size: 20 };

/** The services chips (`ue-gs-pv`): a logo, the name, a check while picked */
export default function ServicePicker({
  onToggle,
  providers,
  selected,
}: Readonly<{
  onToggle: (provider: WatchProvider, on: boolean) => void;
  providers: ReadonlyArray<WatchProvider>;
  selected: ReadonlyArray<WatchProvider>;
}>) {
  if (providers.length === 0) {
    return (
      <div className="flex">
        <Link
          className="inline-flex h-8 items-center rounded-full border-2 border-white/20 px-3.5 text-caption font-medium text-white/80 transition-colors hover:border-white/40"
          href="/settings/streaming-services"
        >
          Choose your services
        </Link>
      </div>
    );
  }
  return (
    <div className={PILL_ROW}>
      {providers.map((provider) => {
        const on = selected.some((entry) => entry.id === provider.id);
        return (
          <Chip
            key={provider.id}
            on={on}
            onToggle={onToggle}
            provider={provider}
          />
        );
      })}
    </div>
  );
}

function Chip({
  on,
  onToggle,
  provider,
}: Readonly<{
  on: boolean;
  onToggle: (provider: WatchProvider, on: boolean) => void;
  provider: WatchProvider;
}>) {
  const classes = cn(
    'inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border-2 pr-3 pl-1.5 text-caption font-medium transition-colors',
    on
      ? 'border-white bg-white/8 text-white'
      : 'border-white/20 text-white/80 hover:border-white/40',
  );
  const toggle = useCallback(
    () => onToggle(provider, !on),
    [on, onToggle, provider],
  );
  return (
    <button
      aria-pressed={on}
      className={classes}
      onClick={toggle}
      type="button"
    >
      {provider.logo ? (
        <ServiceIcon alt="" layout={LOGO} logo={provider.logo} />
      ) : null}
      {provider.name}
      {on ? <Icon glyph={checkGlyph} size={13} /> : null}
    </button>
  );
}
