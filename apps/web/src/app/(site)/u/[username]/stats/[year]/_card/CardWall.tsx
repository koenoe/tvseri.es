import type { CSSProperties } from 'react';

import type { CardShow } from './cardModel';
import type { CardLayout } from './layout';
import { type WallCell, wallLayout } from './wall';

/**
 * The poster wall for `next/og` (satori: absolutely positioned boxes, inline
 * styles only). `posters` are data URLs by rank; null draws the title tile.
 */

/** The poster's shadow and hairline */
const SHADOW =
  '0 20px 40px -16px rgba(0,0,0,0.75), 0 0 0 2px rgba(221,238,255,0.06)';

export default function CardWall({
  hours,
  layout,
  posters,
  shows,
}: Readonly<{
  hours: string | null;
  layout: CardLayout;
  posters: ReadonlyArray<string | null>;
  shows: ReadonlyArray<CardShow>;
}>) {
  const cells = wallLayout(layout.wall, shows.length);
  const first = cells[0];
  return (
    <>
      {cells.map((cell) => {
        const show = shows[cell.rank]!;
        const poster = posters[cell.rank] ?? null;
        // The #1 keeps its title clear of the hours chip
        const reserve =
          cell.rank === 0 && hours ? layout.chip.inset + layout.chip.height : 0;
        return poster ? (
          // biome-ignore lint/performance/noImgElement: satori (next/og) draws plain img elements
          <img
            alt={show.title}
            height={cell.height}
            key={show.id}
            src={poster}
            style={{
              borderRadius: cell.radius,
              boxShadow: SHADOW,
              height: cell.height,
              left: cell.left,
              objectFit: 'cover',
              position: 'absolute',
              top: cell.top,
              width: cell.width,
            }}
            width={cell.width}
          />
        ) : (
          <TitleTile
            cell={cell}
            key={show.id}
            reserve={reserve}
            title={show.title}
          />
        );
      })}
      {first && hours ? (
        <HoursChip cell={first} hours={hours} layout={layout} />
      ) : null}
    </>
  );
}

/** "36h" on the #1 poster */
function HoursChip({
  cell,
  hours,
  layout,
}: Readonly<{ cell: WallCell; hours: string; layout: CardLayout }>) {
  const { chip } = layout;
  const chipStyle: CSSProperties = {
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,15,0.72)',
    borderRadius: chip.radius,
    color: '#ffffff',
    display: 'flex',
    fontSize: chip.size,
    fontWeight: 700,
    height: chip.height,
    left: cell.left + chip.inset,
    lineHeight: 1,
    padding: `0 ${chip.padding}px`,
    position: 'absolute',
    top: cell.top + cell.height - chip.inset - chip.height,
    whiteSpace: 'nowrap',
  };
  return <div style={chipStyle}>{hours}</div>;
}

/**
 * No poster: a dark 2:3 tile with the title in Inter 600, as elsewhere on
 * the site (`PosterArt`'s placeholder, scaled to the cell).
 */
function TitleTile({
  cell,
  reserve,
  title,
}: Readonly<{
  cell: WallCell;
  /** Room kept free at the bottom, in px */
  reserve: number;
  title: string;
}>) {
  const padding = Math.round(cell.width * 0.1);
  const inset = Math.round(cell.width * 0.05);
  const tileStyle: CSSProperties = {
    backgroundImage: 'linear-gradient(165deg, #2b3335 0%, #1a1f20 70%)',
    borderRadius: cell.radius,
    boxShadow: SHADOW,
    display: 'flex',
    flexDirection: 'column',
    height: cell.height,
    justifyContent: 'flex-end',
    left: cell.left,
    overflow: 'hidden',
    padding,
    paddingBottom: padding + reserve,
    position: 'absolute',
    top: cell.top,
    width: cell.width,
  };
  const frameStyle: CSSProperties = {
    border: '1px dashed rgba(255,255,255,0.14)',
    borderRadius: Math.max(4, cell.radius - inset),
    bottom: inset,
    left: inset,
    position: 'absolute',
    right: inset,
    top: inset,
  };
  const titleStyle: CSSProperties = {
    color: '#ffffff',
    display: 'block',
    fontSize: Math.max(16, Math.round(cell.width * 0.13)),
    fontWeight: 600,
    lineClamp: 3,
    lineHeight: 1.2,
  };
  return (
    <div style={tileStyle}>
      <div style={frameStyle} />
      <div style={titleStyle}>{title}</div>
    </div>
  );
}
