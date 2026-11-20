import Image from 'next/image';

/** The common fit: the logo contained, on its box's bottom left */
export const TITLE_LOGO_FIT = 'object-contain object-left-bottom';

/**
 * How one place draws a show's logo: its classes (fit, shade, and its size
 * when it has no box) and its `sizes`. The logo fills `box`; with `width`
 * and `height` it keeps that intrinsic size instead (inside `box` when the
 * place has one).
 */
export type TitleLogoLook = Readonly<
  {
    logo: string;
    /** the image's `sizes`: the logo's widest drawn width */
    sizes?: string;
  } & (
    | { box: string; height?: never; width?: never }
    | { box?: string; height: number; width: number }
  )
>;

/**
 * A place's title treatment: its logo's look, and the written title's
 * classes for a show without one (`lines` wraps the words in a second span,
 * for a line limit inside a box that aligns them)
 */
export type TitleTreatmentLook = TitleLogoLook &
  Readonly<{ lines?: string; text: string }>;

type Tag = 'h1' | 'h3' | 'span';

type LogoProps = Readonly<{
  /** the logo's alt: the title, or '' where a link around it names it */
  alt?: string;
  /** the box's element: a heading where the title is the page's or card's heading */
  as?: Tag;
  draggable?: boolean;
  loading?: 'eager' | 'lazy';
  look: TitleLogoLook;
  /**
   * The logo is the card's part in the hand-off to the show page
   * (`showMorph.ts`): marks the drawn box, the element that glides
   */
  morph?: boolean;
  src: string;
  title: string;
}>;

/**
 * The show's logo as one place draws it (`look`), its alt the title. For a
 * place that writes its own title when there is no logo; the others use
 * `TitleTreatment`.
 */
export function TitleTreatmentLogo({
  alt,
  as: Box = 'span',
  draggable,
  loading,
  look,
  morph = false,
  src,
  title,
}: LogoProps) {
  const logoAlt = alt ?? title;
  const part = morph ? 'logo' : undefined;
  // the box glides where there is one, else the image itself
  const imagePart = look.box === undefined ? part : undefined;
  const image =
    look.width === undefined ? (
      <Image
        alt={logoAlt}
        className={look.logo}
        data-show-morph={imagePart}
        draggable={draggable}
        fill
        loading={loading}
        sizes={look.sizes}
        src={src}
      />
    ) : (
      <Image
        alt={logoAlt}
        className={look.logo}
        data-show-morph={imagePart}
        draggable={draggable}
        height={look.height}
        loading={loading}
        sizes={look.sizes}
        src={src}
        width={look.width}
      />
    );
  return look.box === undefined ? (
    image
  ) : (
    <Box className={look.box} data-show-morph={part}>
      {image}
    </Box>
  );
}

/**
 * A show's title on its picture: its logo (the title treatment) as the place
 * draws it, or, when the show has none, its title in the place's type. Only
 * the drawing: each place passes its own look and loading.
 */
export default function TitleTreatment({
  as: Text = 'span',
  look,
  src,
  title,
  ...logo
}: Omit<LogoProps, 'look' | 'src'> &
  Readonly<{ look: TitleTreatmentLook; src: string | null | undefined }>) {
  if (!src) {
    return (
      <Text className={look.text}>
        {look.lines === undefined ? (
          title
        ) : (
          <span className={look.lines}>{title}</span>
        )}
      </Text>
    );
  }
  return (
    <TitleTreatmentLogo
      {...logo}
      as={Text}
      look={look}
      src={src}
      title={title}
    />
  );
}
