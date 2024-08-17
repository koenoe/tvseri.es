import { cva } from 'class-variance-authority';

import hexToRgb from '@/utils/hexToRgb';

import { type Props } from './Background';
import BackgroundImage from './BackgroundImage';

export const backgroundBaseStyles = cva(
  'absolute inset-0 z-0 transform-gpu w-screen h-screen',
);

const backdropFilterValue = 'saturate(120%) blur(60px)';
const maskImageValue = `
  linear-gradient(
    to bottom,
    transparent,
    rgba(0, 0, 0, 0.068) 3.3%,
    rgba(0, 0, 0, 0.145) 5.9%,
    rgba(0, 0, 0, 0.227) 8.1%,
    rgba(0, 0, 0, 0.313) 10.1%,
    rgba(0, 0, 0, 0.401) 12.1%,
    rgba(0, 0, 0, 0.49) 14.6%,
    rgba(0, 0, 0, 0.578) 17.7%,
    rgba(0, 0, 0, 0.661) 21.8%,
    rgba(0, 0, 0, 0.74) 27.1%,
    rgba(0, 0, 0, 0.812) 33.9%,
    rgba(0, 0, 0, 0.875) 42.4%,
    rgba(0, 0, 0, 0.927) 53%,
    rgba(0, 0, 0, 0.966) 66%,
    rgba(0, 0, 0, 0.991) 81.5%,
    rgba(0, 0, 0, 0.991) 100%
  )`;

function BackgroundBase({
  color,
  context,
  image,
}: Pick<Props, 'color' | 'context' | 'image'>) {
  const rgbString = hexToRgb(color).join(',');

  return (
    <>
      <BackgroundImage
        src={image}
        style={{
          opacity: context === 'spotlight' ? 0.3 : 1,
        }}
      />
      {context === 'page' && (
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `linear-gradient(270deg, rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.9) 60%, rgba(${rgbString}, 1) 100%)`,
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 1) 100%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 h-1/5 w-full"
        style={{
          backgroundImage: `linear-gradient(to top, ${color}, transparent)`,
          ...(context === 'page' && {
            backdropFilter: backdropFilterValue,
            WebkitBackdropFilter: backdropFilterValue, // Safari support
            maskImage: maskImageValue,
            WebkitMaskImage: maskImageValue, // Safari support
          }),
        }}
      />
    </>
  );
}

export default BackgroundBase;
