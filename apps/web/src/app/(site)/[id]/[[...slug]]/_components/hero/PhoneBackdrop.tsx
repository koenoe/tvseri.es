'use client';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import { useBackground } from '@/components/background/BackgroundProvider';
import hexToRgb from '@/components/background/hexToRgb';

/**
 * A dark top fade, so the header row reads on bright backdrops, and a fade
 * to the page colour from the bottom, so the hero's text below the art's
 * upper half reads and the art meets the page with no edge.
 */
export const phoneHeroShade = (color: string) => {
  const rgb = hexToRgb(color).join(',');
  return {
    background: `linear-gradient(180deg, rgba(20,17,13,0.55) 0%, rgba(20,17,13,0) 22%), linear-gradient(0deg, rgb(${rgb}) 0%, rgba(${rgb},0.75) 30%, rgba(${rgb},0) 58%)`,
  };
};

/**
 * The phone hero's backdrop: 960px of art from the top of the screen, behind
 * the header, the hero and the cast, faded into the page colour (`shade`),
 * instead of the page's full-screen one (hidden below 768px on this page).
 * Reads the background store, so an admin's live pick and Back restores
 * show here too. Same `src`/`srcSet`/`sizes` as the page backdrop: one
 * download.
 */
export default function PhoneBackdrop() {
  const image = useBackground((state) => state.backgroundImage);
  const color = useBackground((state) => state.backgroundColor);
  if (!image) {
    return null;
  }
  const props = getBackgroundImageProps(image);
  const shadeStyle = phoneHeroShade(color);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[960px] overflow-hidden md:hidden"
    >
      {/* biome-ignore lint/performance/noImgElement: the page backdrop's own srcset through the TMDB loader */}
      <img
        alt=""
        className="size-full object-cover object-[center_22%]"
        decoding="async"
        fetchPriority="high"
        sizes={props.sizes}
        src={props.src}
        srcSet={props.srcSet}
      />
      <span className="absolute inset-0" style={shadeStyle} />
    </div>
  );
}
