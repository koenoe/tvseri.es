'use client';

import type { PersonAward } from '@tvseri.es/schemas';
import { upperFirst } from '@tvseri.es/utils';
import SideSheet from '@/components/ui/dialog/SideSheet';
import { calendarGlyph, showGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { RowErrorCard } from '@/components/ui/row/RowError';

import { plural } from '@/lib/format/text';

function AwardList({
  items,
  title,
}: Readonly<{ items: ReadonlyArray<PersonAward>; title: string }>) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-overline text-white/80 uppercase">{title}</h3>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            className="flex min-h-15 flex-col justify-center gap-1.5 border-t border-white/6 py-2"
            key={`${item.award}|${item.year ?? ''}|${item.work ?? ''}`}
          >
            <b className="text-body-sm font-semibold">
              {upperFirst(item.award)}
            </b>
            <MetaRow className="gap-3">
              <MetaItem icon={showGlyph} shrink>
                {item.work}
              </MetaItem>
              <MetaItem icon={calendarGlyph}>{item.year}</MetaItem>
            </MetaRow>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The list's read failed: ERFinal's card, in the sheet, with Try again; the
 * card's own inset (12px, 32 from md) taken back, so it lines up with the
 * sheet's title
 */
function AwardsFailed({
  onRetry,
  retrying,
}: Readonly<{ onRetry: () => void; retrying: boolean }>) {
  return (
    <div className="relative h-40 [--row-end:-12px] [--row-start:-12px] md:[--row-start:-32px]">
      {retrying ? (
        <RowErrorCard state="retrying" title="The awards" />
      ) : (
        <RowErrorCard onRetry={onRetry} state="failed" title="The awards" />
      )}
    </div>
  );
}

/** "11 wins, 1 nomination": what is there (a Walk of Fame star was never a nomination) */
const countLine = (won: number, nominated: number) =>
  [
    won > 0 ? plural(won, 'win') : null,
    nominated > 0 ? plural(nominated, 'nomination') : null,
  ]
    .filter(Boolean)
    .join(', ');

/**
 * Every award and nomination from Wikidata, wins first then newest (in the Shows
 * rows' style, in the shared side sheet).
 * A list that failed to load says so inside the sheet.
 */
export default function AwardsSheet({
  items,
  name,
  onOpenChange,
  onRetry,
  open,
  retrying,
}: Readonly<{
  items: ReadonlyArray<PersonAward> | 'failed';
  name: string;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  open: boolean;
  retrying: boolean;
}>) {
  const title = `${name}’s awards`;
  if (items === 'failed') {
    return (
      <SideSheet onOpenChange={onOpenChange} open={open} title={title}>
        <AwardsFailed onRetry={onRetry} retrying={retrying} />
      </SideSheet>
    );
  }
  const won = items.filter((item) => item.won);
  const nominated = items.filter((item) => !item.won);
  return (
    <SideSheet
      description={countLine(won.length, nominated.length)}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <div className="flex flex-col gap-8">
        <AwardList items={won} title="Won" />
        <AwardList items={nominated} title="Nominated" />
      </div>
    </SideSheet>
  );
}
