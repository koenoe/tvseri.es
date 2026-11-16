'use client';

import {
  type CSSProperties,
  type MouseEvent,
  memo,
  type PointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

import Face, { type FaceLook } from '@/components/ui/faces/Face';
import cn from '@/lib/cn';
import personPath from '@/lib/routing/personPath';

import type { CreditPerson } from './episodeCredits';

type Props = Readonly<{
  label: string;
  people: ReadonlyArray<CreditPerson>;
  /** 88px guest faces, or the 60px "Starring" row. */
  size: 'large' | 'small';
  className?: string;
}>;

const LABEL =
  'text-[11px] font-semibold uppercase leading-[normal] tracking-[0.16em] text-white/60 max-lg:leading-5 max-lg:tracking-[0.08em]';

/** The photo's ring and grow; on phones up to 60px, smaller so every face fits */
const PHOTO =
  'block rounded-full border-2 border-white object-cover shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-115 group-focus-visible:scale-115 group-data-revealed:scale-115 max-lg:size-(--phone-face) max-lg:shadow-none';

/** The name and role fade up below the face, kept inside the row's ends on phones */
const EPISODE_CAPTION: Omit<FaceLook, 'photo' | 'sizes'> = {
  caption:
    'pointer-events-none absolute top-[calc(100%+14px)] left-1/2 flex -translate-x-1/2 -translate-y-[15px] flex-col items-center gap-1 whitespace-nowrap text-center opacity-0 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [text-shadow:0_1px_8px_rgb(0_0_0/0.8)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-data-revealed:translate-y-0 group-data-revealed:opacity-100 max-lg:group-first:left-0 max-lg:group-first:translate-x-0 max-lg:group-first:items-start max-lg:group-last:right-0 max-lg:group-last:left-auto max-lg:group-last:translate-x-0 max-lg:group-last:items-end',
  link: 'group relative z-0 -mr-4 flex flex-col items-center outline-none hover:z-10 focus-visible:z-10 data-revealed:z-10 max-lg:mr-0 max-lg:-ml-3',
  name: 'font-semibold text-[14px] leading-[18px]',
  role: 'text-[12px] text-white/65 leading-4',
  size: 88,
};

// Each place keeps its own look on purpose; don't unify them.

/** Guest starring: 88px faces */
const GUEST_FACE: FaceLook = {
  ...EPISODE_CAPTION,
  photo: `${PHOTO} size-[88px]`,
  sizes: '88px',
};

/** Starring: 60px faces */
const STARRING_FACE: FaceLook = {
  ...EPISODE_CAPTION,
  photo: `${PHOTO} size-[60px]`,
  sizes: '60px',
};

/** One face; a tap that reveals first is the row's (`onClick`) */
function EpisodeFace({
  look,
  onClick,
  onPointerDown,
  person,
  revealed,
}: Readonly<{
  look: FaceLook;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  person: CreditPerson;
  revealed: boolean;
}>) {
  const label = `${person.name} as ${person.character}`;
  const href = personPath(person.id);
  return (
    <Face
      alt=""
      data-person={person.id}
      data-revealed={revealed ? '' : undefined}
      href={href}
      image={person.image}
      label={label}
      look={look}
      name={person.name}
      onClick={onClick}
      onPointerDown={onPointerDown}
      role={person.character}
    />
  );
}

/**
 * The cast faces: overlapping circles with a 2px white
 * ring; hover or focus brings one forward (scale 1.15) and fades its name and
 * character in below, like the show page's cast. On touch the first tap
 * reveals the name and the second opens the person.
 */
function EpisodeFaces({ className, label, people, size }: Props) {
  const [revealed, setRevealed] = useState<number | null>(null);
  const touch = useRef(false);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    touch.current = event.pointerType === 'touch';
  }, []);

  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      const id = Number(event.currentTarget.dataset.person);
      if (touch.current && revealed !== id) {
        event.preventDefault();
        setRevealed(id);
      }
    },
    [revealed],
  );

  if (people.length === 0) {
    return null;
  }

  const rowClasses = cn(
    'flex pr-4 max-lg:pb-0 max-lg:pl-3',
    size === 'large' ? 'pb-[46px]' : 'pb-10',
  );
  const look = size === 'large' ? GUEST_FACE : STARRING_FACE;
  // Phones: up to 60px, smaller so every face fits the width.
  const rowStyle = {
    '--phone-face': `min(60px, calc((100vw - 40px + ${12 * (people.length - 1)}px) / ${people.length}))`,
  } as CSSProperties;
  const columnClasses = cn(
    'mt-1.5 flex flex-col gap-3 max-lg:mt-2 max-lg:gap-2.5',
    className,
  );

  return (
    <div className={columnClasses}>
      <span className={LABEL}>{label}</span>
      <div className={rowClasses} style={rowStyle}>
        {people.map((person) => (
          <EpisodeFace
            key={person.id}
            look={look}
            onClick={onClick}
            onPointerDown={onPointerDown}
            person={person}
            revealed={revealed === person.id}
          />
        ))}
      </div>
    </div>
  );
}

const MemoEpisodeFaces = memo(EpisodeFaces);
MemoEpisodeFaces.displayName = 'EpisodeFaces';
export default MemoEpisodeFaces;
