import {
  CardHandle,
  CardHeadline,
  CardLogo,
  CardStats,
  CardYear,
} from './CardText';
import CardWall from './CardWall';
import CardWeeks from './CardWeeks';
import type { CardModel } from './cardModel';
import { CARD_FONT } from './fonts';
import type { CardLayout } from './layout';
import type { ThemeStyle } from './theme';

/**
 * The share card (STShare V2b) as `next/og` JSX: one component for the
 * story, the square and the og:image, laid out by `CARD_LAYOUTS`. Satori
 * rules: flexbox and absolute positioning only, inline styles, every box
 * with more than one child is `display: flex`.
 */

type Props = Readonly<{
  model: CardModel;
  layout: CardLayout;
  style: ThemeStyle;
  /** Wall posters as data URLs by rank (null: the title tile) */
  posters: ReadonlyArray<string | null>;
}>;

export default function CardImage({ layout, model, posters, style }: Props) {
  const hasWall = model.top.length > 0;
  const weeksTop =
    !hasWall && layout.weeks.topWithoutWall !== null
      ? layout.weeks.topWithoutWall
      : layout.weeks.top;
  return (
    <div
      style={{
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: '#ffffff',
        display: 'flex',
        fontFamily: CARD_FONT.inter,
        height: layout.height,
        // No `overflow: hidden`: satori drops a clipped box's absolute
        // children when it's scaled (the thumbnail); the canvas clips anyway
        position: 'relative',
        width: layout.width,
      }}
    >
      <CardLogo layout={layout} />
      <CardHandle layout={layout} username={model.username} />
      <CardYear layout={layout} year={model.year} />
      {model.headline ? (
        <CardHeadline layout={layout} lines={model.headline} />
      ) : null}
      <CardStats layout={layout} model={model} style={style} />
      {hasWall ? (
        <CardWall
          hours={model.topHours}
          layout={layout}
          posters={posters}
          shows={model.top}
        />
      ) : null}
      <CardWeeks
        layout={layout}
        streak={model.streak}
        style={style}
        top={weeksTop}
        weeks={model.weeks}
      />
    </div>
  );
}
