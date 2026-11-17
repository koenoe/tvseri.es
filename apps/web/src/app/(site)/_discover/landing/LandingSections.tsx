import type { ReactNode } from 'react';

import GuardedSection from '@/components/ui/row/GuardedSection';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import cn from '@/lib/cn';

import { SwitchGhost } from './skeletons';

/**
 * Everything below the hero, in the landings' rhythm: 64 between
 * sections on desktop, 48 on a phone; the first section 48 (title-led hero,
 * genre) or 64 (hero with a tile, theme) under the hero. On a phone
 * a title-led hero (whose chips end it) is 32 above it: the section's title
 * sits about 6px inside its line, so the chips look as far from it as from
 * the facts over them; under a tile 48. The page ends on purpose with
 * `LandingEndCard`.
 */
export function LandingSections({
  children,
  placeholder = false,
  start = 'tight',
}: Readonly<{
  children: ReactNode;
  /** the whole page's placeholder (`data-placeholder`, else this is the content's `data-slot="landing-rows"`) */
  placeholder?: boolean;
  start?: 'loose' | 'tight';
}>) {
  const rowsClass = cn(
    'flex flex-col gap-12 md:gap-16',
    start === 'loose' ? 'mt-12 md:mt-16' : 'mt-8 md:mt-12',
  );
  return (
    <div
      className={rowsClass}
      data-placeholder={placeholder ? 'landing-rows' : undefined}
      data-slot={placeholder ? undefined : 'landing-rows'}
    >
      {children}
    </div>
  );
}

/**
 * One streamed poster row: its own error state (a per-section error,
 * the rest of the page stays) and a skeleton of its exact size. `switcher`
 * keeps room for the row's switch, so loading shifts nothing.
 */
export function LandingRowSlot({
  children,
  id,
  switcher = false,
  title,
}: Readonly<{
  children: ReactNode;
  /** the same id as the row inside */
  id: string;
  switcher?: boolean;
  title: string;
}>) {
  const ghost = switcher ? <SwitchGhost /> : undefined;
  const skeleton = (
    <RowSkeleton id={id} look="landing" switcher={ghost} title={title} />
  );
  return (
    <GuardedSection fallback={skeleton} id={id} title={title}>
      {children}
    </GuardedSection>
  );
}
