import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';

import Background, { type BackgroundContext } from './Background';
import { BackgroundProvider } from './BackgroundProvider';
import BackgroundStyle from './BackgroundStyle';
import { toPageColor } from './pageColor';
import { DEFAULT_BACKGROUND_IMAGE } from './store';

const pattern = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** The dot and grid patterns, drawn in white at 20%. */
const PATTERN_STYLES = {
  dots: {
    backgroundImage: pattern(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'><circle fill='rgb(255 255 255 / 0.2)' cx='10' cy='10' r='1.6257413380501518'/></svg>`,
    ),
  },
  grid: {
    backgroundImage: pattern(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='8' height='8' fill='none' stroke='rgb(255 255 255 / 0.2)'><path d='M0 .5H31.5V32'/></svg>`,
    ),
  },
} as const;

const patternStyles = cva(
  'pointer-events-none absolute -top-32 right-0 bottom-0 left-0 h-screen w-screen [mask-image:radial-gradient(circle,black,transparent_65%)]',
);

/**
 * The page's `<main>`: a loading shell that stands in for a page draws the
 * same box. No bottom padding: the air above the footer is the footer's own
 * (`Footer`), the same on every page.
 */
export const PAGE_MAIN_CLASS =
  'grow scroll-mt-16 pt-16 md:scroll-mt-20 md:pt-20';

export type PageProps = Readonly<{
  /** Six-digit hex (the API's `backdropColor`); anything else is the ground. */
  backgroundColor?: string;
  backgroundImage?: string;
  /** Crossfade when the store's background changes (carousel pages). */
  animateBackground?: boolean;
  /** `none`: the page colour only, no backdrop layer (the Discover landings draw their own static glow) */
  backgroundContext?: BackgroundContext | 'none';
  /** Preload the backdrop with high priority (it's the LCP). */
  backgroundPriority?: boolean;
  /**
   * Classes on a wrapper around the backdrop, e.g. `max-md:hidden` where a
   * page draws its own phone backdrop (the show page).
   */
  backgroundClassName?: string;
  children: ReactNode;
}>;

/**
 * A page with its page colour: the server `<style>` (colour on the first
 * frame of a hard load), the provider that keeps it right across client
 * navigations and Back, and the backdrop. Renders the page's `<main>`.
 *
 * @example
 * <Page backgroundColor={show.backdropColor} backgroundImage={show.backdropImage} backgroundPriority>…</Page>
 */
export default function Page({
  backgroundColor: color,
  backgroundImage = DEFAULT_BACKGROUND_IMAGE,
  animateBackground = false,
  backgroundContext = 'page',
  backgroundPriority = false,
  backgroundClassName,
  children,
}: PageProps) {
  const backgroundColor = toPageColor(color);
  const mainStyle = { backgroundColor };

  const backgroundElement =
    backgroundContext === 'none' ? null : backgroundContext === 'dots' ||
      backgroundContext === 'grid' ? (
      <div
        className={patternStyles()}
        style={PATTERN_STYLES[backgroundContext]}
      />
    ) : (
      <Background
        animated={animateBackground}
        color={backgroundColor}
        context={backgroundContext}
        image={backgroundImage}
        priority={backgroundPriority}
      />
    );

  return (
    <BackgroundProvider
      initialColor={backgroundColor}
      initialImage={backgroundImage}
    >
      <BackgroundStyle color={backgroundColor} />
      <main className={PAGE_MAIN_CLASS} style={mainStyle}>
        {backgroundClassName ? (
          <div className={backgroundClassName}>{backgroundElement}</div>
        ) : (
          backgroundElement
        )}
        <div className="relative z-10">{children}</div>
      </main>
    </BackgroundProvider>
  );
}
