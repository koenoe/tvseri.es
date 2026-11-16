import type { CardShow } from './cardModel';
import type { CardLayout } from './layout';
import { type WallCell, wallLayout } from './wall';

/**
 * The poster wall for `next/og` (satori: absolutely positioned boxes, inline
 * styles only). `posters` are data URLs by rank; null draws the title tile.
 */

/** The poster's shadow and hairline, at the layout's scale */
const shadow = (unit: number) =>
  `0 ${20 * unit}px ${40 * unit}px ${-16 * unit}px rgba(0,0,0,0.75), 0 0 0 ${2 * unit}px rgba(221,238,255,0.06)`;

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
  const boxShadow = shadow(layout.unit);
  return (
    <>
      {cells.map((cell) => {
        const show = shows[cell.rank]!;
        const poster = posters[cell.rank] ?? null;
        return poster ? (
          // biome-ignore lint/performance/noImgElement: satori (next/og) draws plain img elements
          <img
            alt={show.title}
            height={cell.height}
            key={show.id}
            src={poster}
            style={{
              borderRadius: cell.radius * layout.unit,
              boxShadow,
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
            boxShadow={boxShadow}
            cell={cell}
            key={show.id}
            // The #1 keeps its title clear of the hours chip
            reserve={
              cell.rank === 0 && hours
                ? layout.chip.inset + layout.chip.height
                : 0
            }
            title={show.title}
            unit={layout.unit}
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
  return (
    <div
      style={{
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
      }}
    >
      {hours}
    </div>
  );
}

/**
 * No poster: a dark 2:3 tile with the title in Inter 600, as elsewhere on
 * the site (`PosterArt`'s placeholder, scaled to the cell).
 */
function TitleTile({
  boxShadow,
  cell,
  reserve,
  title,
  unit,
}: Readonly<{
  boxShadow: string;
  cell: WallCell;
  /** Room kept free at the bottom, in px */
  reserve: number;
  title: string;
  unit: number;
}>) {
  const padding = Math.round(cell.width * 0.1);
  const inset = Math.round(cell.width * 0.05);
  return (
    <div
      style={{
        backgroundImage: 'linear-gradient(165deg, #2b3335 0%, #1a1f20 70%)',
        borderRadius: cell.radius * unit,
        boxShadow,
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
      }}
    >
      <div
        style={{
          border: `${unit}px dashed rgba(255,255,255,0.14)`,
          borderRadius: Math.max(4 * unit, cell.radius * unit - inset),
          bottom: inset,
          left: inset,
          position: 'absolute',
          right: inset,
          top: inset,
        }}
      />
      <div
        style={{
          color: '#ffffff',
          display: 'block',
          fontSize: Math.max(16 * unit, Math.round(cell.width * 0.13)),
          fontWeight: 600,
          lineClamp: 3,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
    </div>
  );
}
