import { type TvSeries } from '@tvseri.es/types';
import { cx } from 'class-variance-authority';

import useRgbString from '@/hooks/useRgbString';

import BackgroundImage from '../Background/BackgroundImage';

export default function SpotlightBackground({
  className,
  item,
}: Readonly<{ className?: string; item: TvSeries }>) {
  const rgbString = useRgbString(item.backdropColor);

  return (
    <div className={cx('absolute inset-0', className)}>
      {item.backdropImage && <BackgroundImage src={item.backdropImage} />}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `linear-gradient(270deg, rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.4) 50%, rgba(${rgbString}, 1) 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.7) 100%)`,
        }}
      />
    </div>
  );
}
