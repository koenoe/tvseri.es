import TileLink from '@/components/ui/tile/TileLink';
import { PERSON_PREFETCH } from '@/components/ui/tile/tilePrefetch';
import cn from '@/lib/cn';
import personPath from '@/lib/routing/personPath';

import type { RollBlock } from './episodeCredits';

/** Phones draw only these under the faces (no roll, no lists). */
const PHONE_ROLES = new Set(['Directed by', 'Written by']);

/**
 * The credits' blocks: role over name(s), or name |
 * character pairs. The roll draws them twice for a seamless loop; the copy
 * is hidden from assistive tech and the tab order, and from phones.
 */
export default function CreditBlocks({
  blocks,
  copy,
}: Readonly<{ blocks: ReadonlyArray<RollBlock>; copy?: boolean }>) {
  const tabIndex = copy ? -1 : undefined;
  return (
    <div
      aria-hidden={copy || undefined}
      className="flex flex-col items-stretch gap-11 pt-[300px] max-lg:gap-4 max-lg:pt-2 data-copy:max-lg:hidden"
      data-copy={copy ? '' : undefined}
    >
      {blocks.map((block) => {
        const blockClasses = cn(
          'flex flex-col items-center gap-2.5 text-center max-lg:gap-1.5',
          !PHONE_ROLES.has(block.role) && 'max-lg:hidden',
        );
        return (
          <div className={blockClasses} key={block.role}>
            <span className="text-[11px] font-semibold uppercase leading-[normal] tracking-[0.16em] text-white/60 max-lg:leading-5 max-lg:tracking-[0.08em]">
              {block.role}
            </span>
            {block.kind === 'names' ? (
              <span className="flex flex-col items-center gap-2.5 max-lg:block">
                {block.people.map((person, index) => (
                  <span key={person.id}>
                    {index > 0 ? <span className="lg:hidden">, </span> : null}
                    <TileLink
                      className="font-medium text-[19px] leading-[26px] hover:underline max-lg:font-normal max-lg:text-body-sm"
                      href={personPath(person.id, person.slug)}
                      prefetchOn={PERSON_PREFETCH}
                      tabIndex={tabIndex}
                    >
                      {person.name}
                    </TileLink>
                  </span>
                ))}
              </span>
            ) : (
              <div className="grid w-full grid-cols-2 gap-x-6 gap-y-2 max-lg:gap-y-1">
                {block.people.map((person) => (
                  <PairRow
                    key={person.id}
                    person={person}
                    tabIndex={tabIndex}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PairRow({
  person,
  tabIndex,
}: Readonly<{
  person: Extract<RollBlock, { kind: 'pairs' }>['people'][number];
  tabIndex: number | undefined;
}>) {
  return (
    <>
      <TileLink
        className="text-right font-medium text-[16px] text-white/60 leading-[22px] hover:underline max-lg:text-body-sm"
        href={personPath(person.id, person.slug)}
        prefetchOn={PERSON_PREFETCH}
        tabIndex={tabIndex}
      >
        {person.name}
      </TileLink>
      <span className="text-left text-[16px] text-white/60 leading-[22px] max-lg:text-body-sm">
        {person.character}
      </span>
    </>
  );
}
