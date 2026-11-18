import type { ReactNode } from 'react';

import Background from './Background';
import { BackgroundProvider } from './BackgroundProvider';
import BackgroundStyle from './BackgroundStyle';
import { toPageColor } from './pageColor';
import { DEFAULT_BACKGROUND_IMAGE } from './store';

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
  /**
   * `page`: the backdrop and its gradients; `none`: the page colour only (the
   * Discover landings draw their own static glow). By default `page` with a
   * backdrop image or `animateBackground`, else `none`: gradients in the
   * page colour over the page colour would draw nothing.
   */
  backgroundContext?: 'page' | 'none';
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
  backgroundImage,
  animateBackground = false,
  backgroundContext = backgroundImage || animateBackground ? 'page' : 'none',
  backgroundPriority = false,
  backgroundClassName,
  children,
}: PageProps) {
  const backgroundColor = toPageColor(color);
  const mainStyle = { backgroundColor };

  const image = backgroundImage ?? DEFAULT_BACKGROUND_IMAGE;

  const backgroundElement =
    backgroundContext === 'none' ? null : (
      <Background
        animated={animateBackground}
        color={backgroundColor}
        image={image}
        priority={backgroundPriority}
      />
    );

  return (
    <BackgroundProvider initialColor={backgroundColor} initialImage={image}>
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
