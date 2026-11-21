'use client';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import { useBackground } from '@/components/background/BackgroundProvider';
import { heroShade } from '@/components/background/heroShade';
import hexToRgb from '@/components/background/hexToRgb';
import { PROGRESSIVE_BLUR } from '@/components/background/progressiveBlur';

/**
 * A dark top fade that holds behind the header row (its first 8%) so the
 * white header reads on bright art, then lets the art through; and a fade
 * to the page colour from the bottom that is already deep where the hero's
 * text starts, so it reads on busy art and the art meets the page with no
 * edge. In pixels from each end, so they hold where the header and the
 * title are whatever the art's height. Under both, the heroes' own shade
 * (`heroShade`: the vignette and the side fade every hero under the header
 * has, the desktop backdrop and the Spotlight too), so the phone's art
 * meets the page as softly as theirs.
 */
export const phoneHeroShade = (color: string) => {
  const rgb = hexToRgb(color).join(',');
  return {
    background: `linear-gradient(180deg, rgba(20,17,13,0.65) 0px, rgba(20,17,13,0.5) 82px, rgba(20,17,13,0) 200px), linear-gradient(0deg, rgb(${rgb}) 0px, rgba(${rgb},0.85) 60px, rgba(${rgb},0.45) 120px, rgba(${rgb},0) 190px), ${heroShade(color)}`,
  };
};

/**
 * The phone hero's backdrop: 440px of art from the top of the screen, behind
 * the header and the title, faded into the page colour at its foot, where
 * the title sits (`shade`),
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
      className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[440px] overflow-hidden md:hidden"
    >
      {/* biome-ignore lint/performance/noImgElement: the page backdrop's own srcset through the TMDB loader */}
      <img
        alt=""
        className="size-full object-cover object-top"
        decoding="async"
        fetchPriority="high"
        sizes={props.sizes}
        src={props.src}
        srcSet={props.srcSet}
      />
      <span
        className="absolute inset-x-0 top-[250px] bottom-0"
        style={PROGRESSIVE_BLUR}
      />
      <span className="absolute inset-0" style={shadeStyle} />
    </div>
  );
}
