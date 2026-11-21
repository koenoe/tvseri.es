import cn from '@/lib/cn';

/** Where a country's flag is served (prerendered SVG files, `app/api/flags`). */
const flagSrc = (code: string) => `/api/flags/${code.toUpperCase()}`;

/**
 * A country flag as an SVG (3:2). Emoji flags show as two letters on Windows,
 * so every flag is a picture, one small file per country, loaded only when
 * it's drawn (`lazy` in the country list). The grey block shows until it
 * arrives, and for the rare code the set has no flag for.
 */
export default function Flag({
  className,
  code,
  lazy = false,
}: Readonly<{ className?: string; code: string; lazy?: boolean }>) {
  const classes = cn(
    'image-outline inline-block shrink-0 rounded-[3px] bg-white/8',
    className,
  );
  const loading = lazy ? 'lazy' : 'eager';
  const src = flagSrc(code);
  return (
    // biome-ignore lint/performance/noImgElement: a 1 KB static SVG, nothing to optimise
    <img
      alt=""
      className={classes}
      decoding="async"
      height={21}
      loading={loading}
      src={src}
      width={32}
    />
  );
}
