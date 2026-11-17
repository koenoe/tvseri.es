import Image from 'next/image';

import { importGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

const TILES = 12;

/** Blank tiles when the viewer has no shows yet: the wall keeps its texture. */
const BLANK = Array.from({ length: TILES }, (_, index) => `blank-${index}`);

/**
 * The drop zone's picture: the viewer's own posters
 * as a tilted wall at 28%, a radial fade, the tray and the two lines. Shared
 * by the live drop zone and the section's loading frame, so nothing moves
 * when the importer arrives.
 */
export default function DropZoneFace({
  posters,
}: Readonly<{ posters: ReadonlyArray<string> }>) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -inset-5 grid rotate-[-4deg] scale-108 grid-cols-6 gap-2.5 opacity-28"
      >
        {posters.length > 0
          ? posters.map((poster) => (
              <Image
                alt=""
                className="aspect-2/3 w-full rounded-10 object-cover"
                height={270}
                key={poster}
                loading="eager"
                sizes="180px"
                src={poster}
                width={180}
              />
            ))
          : BLANK.map((key) => (
              <span
                className="aspect-2/3 w-full rounded-10 bg-white/10"
                key={key}
              />
            ))}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgb(21_27_28/0.92)_25%,rgb(21_27_28/0.55)_70%,rgb(21_27_28/0.35)_100%)]"
      />
      <span className="relative flex flex-col items-center gap-2 text-center">
        <span className="mb-2 flex size-15 items-center justify-center rounded-full bg-white/12 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] backdrop-blur-md">
          <Icon glyph={importGlyph} size={24} />
        </span>
        <b className="text-title-1 max-md:text-title-2">
          Drop your watch history
        </b>
        <span className="text-body-sm text-white/60 max-md:px-5">
          A CSV from Netflix, Prime Video or anywhere · up to 4 MB · read in
          your browser
        </span>
      </span>
    </>
  );
}

/**
 * Where the picture's block (the tray and the two lines) sits from md: at
 * the top the centring gave it, (300 − 148) / 2 = 76px. From md its lines
 * never wrap, so the block is always 148px tall and this is the centre;
 * pinned to the top, it stays put when a slow device paints the tray before
 * the lines under it are parsed (centred, the tray moved up 40px as they
 * arrived: CLS 0.023 at 800px). Below md the line wraps, so it stays centred.
 */
const FACE_TOP = 'md:justify-start md:pt-[76px]';

/** The frame both share: 300px (240 on phones), the inset edge. */
export const DROP_ZONE_FRAME = `relative flex h-75 w-full flex-col items-center justify-center overflow-hidden rounded-[22px] bg-[#151b1c] text-white shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.14)] max-md:h-60 ${FACE_TOP}`;
