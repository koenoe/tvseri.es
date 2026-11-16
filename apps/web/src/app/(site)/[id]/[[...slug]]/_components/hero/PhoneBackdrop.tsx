'use client';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import { useBackground } from '@/components/background/BackgroundProvider';
import { heroShade } from '@/components/background/heroShade';
import hexToRgb from '@/components/background/hexToRgb';

/**
 * A fade to the page colour (the colour at the bottom, 30% at 55%, 60% at the top)
 * over the hero shade. The top stop is back
 * on phones only, so the header row reads on bright
 * backdrops: measured on 40 backdrops, none under 4.5:1 with it (worst 5.5),
 * 7 without (worst 3.2). Home's spotlight and the desktop show page keep the
 * shade alone.
 */
export const phoneHeroShade = (color: string) => {
  const rgb = hexToRgb(color).join(',');
  return {
    background: `linear-gradient(0deg, rgb(${rgb}) 0%, rgba(${rgb},0.3) 55%, rgba(${rgb},0.6) 100%), ${heroShade(color)}`,
  };
};

/**
 * The phone hero's backdrop (fm-hero): the backdrop 440px tall
 * from the top of the screen, faded into the page colour (`shade`), instead of
 * the page's full-screen one (hidden below 768px on this page). Reads the
 * background store, so an admin's live pick and Back restores show here too.
 * Same `src`/`srcSet`/`sizes` as the page backdrop: one download.
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
      className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[456px] overflow-hidden md:hidden"
    >
      {/* biome-ignore lint/performance/noImgElement: the page backdrop's own srcset through the TMDB loader */}
      <img
        alt=""
        className="size-full object-cover"
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
