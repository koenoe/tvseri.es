'use client';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import { useBackground } from '@/components/background/BackgroundProvider';
import hexToRgb from '@/components/background/hexToRgb';

/**
 * A dark top fade that holds behind the header row (its first 8%) so the
 * white header reads on bright art, then lets the art through; and a fade
 * to the page colour from the bottom that is already deep where the hero's
 * text starts, so it reads on busy art and the art meets the page with no
 * edge.
 */
export const phoneHeroShade = (color: string) => {
  const rgb = hexToRgb(color).join(',');
  return {
    background: `linear-gradient(180deg, rgba(20,17,13,0.65) 0%, rgba(20,17,13,0.5) 8%, rgba(20,17,13,0) 24%), linear-gradient(0deg, rgb(${rgb}) 0%, rgba(${rgb},0.85) 32%, rgba(${rgb},0.45) 48%, rgba(${rgb},0) 62%)`,
  };
};

/**
 * Production's progressive blur under the hero's text: eased stops, so the
 * blur fades in with no visible edge and busy art turns into soft colour
 * behind the words instead of competing with them
 */
const BLUR_MASK =
  'linear-gradient(to bottom, transparent, rgba(0,0,0,0.068) 3.3%, rgba(0,0,0,0.145) 5.9%, rgba(0,0,0,0.227) 8.1%, rgba(0,0,0,0.313) 10.1%, rgba(0,0,0,0.401) 12.1%, rgba(0,0,0,0.49) 14.6%, rgba(0,0,0,0.578) 17.7%, rgba(0,0,0,0.661) 21.8%, rgba(0,0,0,0.74) 27.1%, rgba(0,0,0,0.812) 33.9%, rgba(0,0,0,0.875) 42.4%, rgba(0,0,0,0.927) 53%, rgba(0,0,0,0.966) 66%, rgba(0,0,0,0.991) 81.5%, rgba(0,0,0,0.991) 100%)';
const BLUR_FILTER = 'saturate(120%) blur(60px)';
const BLUR_STYLE = {
  backdropFilter: BLUR_FILTER,
  maskImage: BLUR_MASK,
  WebkitBackdropFilter: BLUR_FILTER,
  WebkitMaskImage: BLUR_MASK,
} as const;

/**
 * The phone hero's backdrop: 1020px of art from the top of the screen, behind
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
      className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[1020px] overflow-hidden md:hidden"
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
      <span
        className="absolute inset-x-0 top-[36%] bottom-0"
        style={BLUR_STYLE}
      />
      <span className="absolute inset-0" style={shadeStyle} />
    </div>
  );
}
