/* eslint-disable @next/next/no-img-element */
import { cx } from 'class-variance-authority';
import { preload } from 'react-dom';

const createImageUrl = (src: string, width: number): string => {
  return `/_next/image?url=${src}&w=${width}&q=75`;
};

export default function BackgroundImage({
  src,
  className,
  ...rest
}: React.AllHTMLAttributes<HTMLImageElement> & Readonly<{ src: string }>) {
  const HD = createImageUrl(src, 1920);
  const SD = createImageUrl(src, 1280);
  const imageSizes = '100vw';
  const imageSrcSet = `
    ${SD} 768w,
    ${HD} 1200w
  `;

  preload(SD, {
    as: 'image',
    fetchPriority: 'high',
    imageSrcSet,
    imageSizes,
  });

  return (
    <img
      {...rest}
      className={cx('h-full w-full object-cover object-top', className)}
      decoding="async"
      alt=""
      draggable={false}
      sizes={imageSizes}
      srcSet={imageSrcSet}
      // It's intended to keep `src` the last attribute because React updates
      // attributes in order.
      src={SD}
    />
  );
}
