import { LOGO_PATH, LOGO_VIEWBOX } from '@tvseri.es/constants';

import type { CardModel } from './cardModel';
import { CARD_FONT, labelFont } from './fonts';
import type { CardLayout } from './layout';
import type { ThemeStyle } from './theme';

/** The card's type and logo, positioned by the layout */
/** The approved lock-up (`components/ui/Logo`), white, `logo.height` tall */
export function CardLogo({ layout }: Readonly<{ layout: CardLayout }>) {
  const { height, left, top } = layout.logo;
  const width = Math.round(height * 5.169 * 10) / 10;
  return (
    <svg
      fill="#ffffff"
      height={height}
      style={{ left, position: 'absolute', top }}
      viewBox={LOGO_VIEWBOX}
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="scale(1 -1)">
        <path d={LOGO_PATH} />
      </g>
    </svg>
  );
}

/** "@nina": Plus Jakarta Sans 800, the @ smaller, dimmer and raised */
export function CardHandle({
  layout,
  username,
}: Readonly<{ layout: CardLayout; username: string }>) {
  const { right, size, top } = layout.handle;
  const at = size * 0.6;
  return (
    <div
      style={{
        alignItems: 'baseline',
        display: 'flex',
        fontFamily: CARD_FONT.jakarta,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: -0.03 * size,
        lineHeight: 0.95,
        position: 'absolute',
        right,
        top,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: at,
          letterSpacing: 0,
          marginRight: 2 * layout.unit,
          position: 'relative',
          top: -0.214 * at,
        }}
      >
        @
      </span>
      <span>{username}</span>
    </div>
  );
}

export function CardHeadline({
  layout,
  lines,
}: Readonly<{ layout: CardLayout; lines: readonly [string, string] }>) {
  const { left, size, top, width } = layout.headline;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontSize: size,
        fontWeight: 700,
        left,
        letterSpacing: -0.025 * size,
        lineHeight: 1.05,
        position: 'absolute',
        top,
        width,
      }}
    >
      <span>{lines[0]}</span>
      {lines[1] ? <span>{lines[1]}</span> : null}
    </div>
  );
}

/** "2w 6d 20h / of TV", "615 / episodes", "71 / shows, the most yet" */
export function CardStats({
  layout,
  model,
  style,
}: Readonly<{ layout: CardLayout; model: CardModel; style: ThemeStyle }>) {
  const { stats } = layout;
  const items = [
    { label: 'of TV', spot: stats.runtime, value: model.runtime },
    { label: model.episodesLabel, spot: stats.episodes, value: model.episodes },
    { label: model.showsLabel, spot: stats.shows, value: model.shows },
  ];
  return (
    <>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: stats.gap,
            left: item.spot.left,
            position: 'absolute',
            top: item.spot.top,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontSize: stats.value,
              fontWeight: 800,
              letterSpacing: -0.03 * stats.value,
              lineHeight: 1,
            }}
          >
            {item.value}
          </span>
          <span
            style={{
              color: style.soft,
              fontFamily: labelFont(stats.label),
              fontSize: stats.label,
              lineHeight: 1.3,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </>
  );
}

/** "2025": the card's biggest type */
export function CardYear({
  layout,
  year,
}: Readonly<{ layout: CardLayout; year: number }>) {
  const { left, size, top } = layout.year;
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 800,
        left,
        letterSpacing: -0.055 * size,
        lineHeight: 0.78,
        position: 'absolute',
        top,
      }}
    >
      {String(year)}
    </div>
  );
}
