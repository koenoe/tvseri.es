'use client';

import * as m from 'motion/react-m';
import { type ReactNode, useCallback, useState } from 'react';
import MaxMotion from '@/components/motion/MaxMotion';
import { PillSwitch, PillSwitchItem } from '@/components/ui/button/PillSwitch';

type Pick = Readonly<{
  /** The pick's backdrop, blurred under the card (rendered by the server) */
  ambient: ReactNode;
  card: ReactNode;
  id: number;
  title: string;
}>;

const EASE = [0.2, 0.8, 0.2, 1] as const;
const CARD_FADE = { duration: 0.45, ease: EASE } as const;
const AMBIENT_FADE = { duration: 1.2, ease: EASE } as const;

/**
 * The 400px card and its pill switcher: every
 * pick arrives rendered, the pill crossfades between them (opacity only) and
 * the hidden ones are inert. With one pick there is nothing to switch.
 */
export default function PickStage({
  picks,
}: Readonly<{ picks: ReadonlyArray<Pick> }>) {
  const [active, setActive] = useState(0);
  return (
    <MaxMotion>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-14 right-7 -bottom-5 left-7 z-0 hidden xl:block"
        >
          {picks.map((pick, index) => (
            <Ambient active={index === active} key={pick.id}>
              {pick.ambient}
            </Ambient>
          ))}
        </div>
        <div className="relative z-1 h-[400px] overflow-hidden rounded-14 bg-ground-deep shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8)]">
          {picks.map((pick, index) => (
            <Layer active={index === active} key={pick.id}>
              {pick.card}
            </Layer>
          ))}
          {picks.length > 1 ? (
            <Switcher active={active} onPick={setActive} picks={picks} />
          ) : null}
        </div>
      </div>
    </MaxMotion>
  );
}

function Ambient({
  active,
  children,
}: Readonly<{ active: boolean; children: ReactNode }>) {
  const animate = { opacity: active ? 0.45 : 0 };
  return (
    <m.span
      animate={animate}
      className="absolute inset-0 blur-[56px] saturate-150"
      initial={false}
      transition={AMBIENT_FADE}
    >
      {children}
    </m.span>
  );
}

function Layer({
  active,
  children,
}: Readonly<{ active: boolean; children: ReactNode }>) {
  const animate = { opacity: active ? 1 : 0 };
  return (
    <m.div
      animate={animate}
      className="absolute inset-0"
      inert={!active}
      initial={false}
      transition={CARD_FADE}
    >
      {children}
    </m.div>
  );
}

/**
 * Phones: never under the ⋯ (16 + 48 + 8px from the right; three long names
 * at 390 reached it); below xl the names keep a readable width and the pill
 * scrolls sideways instead of cutting each to six letters
 */
const SWITCHER =
  'absolute top-4 left-4 z-5 max-w-[calc(100%-88px)] xl:top-auto xl:right-5 xl:bottom-[30px] xl:left-auto xl:max-w-none xl:overflow-visible';

/**
 * Each name has a bounded width, so the pill never reaches the people chips
 * (desktop) or the ⋯ (phone): a long title ends with an ellipsis
 */
const PICK = 'max-w-[160px] xl:max-w-[120px] xl:shrink';

function Switcher({
  active,
  onPick,
  picks,
}: Readonly<{
  active: number;
  onPick: (index: number) => void;
  picks: ReadonlyArray<Pick>;
}>) {
  return (
    <PillSwitch className={SWITCHER} label="Picks">
      {picks.map((pick, index) => (
        <PickButton
          index={index}
          isActive={index === active}
          key={pick.id}
          onPick={onPick}
          title={pick.title}
        />
      ))}
    </PillSwitch>
  );
}

function PickButton({
  index,
  isActive,
  onPick,
  title,
}: Readonly<{
  index: number;
  isActive: boolean;
  onPick: (index: number) => void;
  title: string;
}>) {
  const pick = useCallback(() => onPick(index), [index, onPick]);
  return (
    <PillSwitchItem
      className={PICK}
      onClick={pick}
      pressed={isActive}
      title={title}
    >
      {title}
    </PillSwitchItem>
  );
}
