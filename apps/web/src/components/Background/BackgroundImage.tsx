import { cx } from 'class-variance-authority';
import { preload } from 'react-dom';

const createImageUrl = (src: string, width: number): string => {
  if (src.includes('w1920_and_h1080_multi_faces') && width === 1280) {
    const resizedSrc = src.replace(
      'w1920_and_h1080_multi_faces',
      'w1280_and_h720_multi_faces',
    );
    return resizedSrc;
  }
  return src;
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
    imageSizes,
    imageSrcSet,
  });

  return (
    // biome-ignore lint/performance/noImgElement: exception
    <img
      {...rest}
      alt=""
      className={cx(
        'relative h-full w-full select-none object-cover object-top',
        className,
      )}
      decoding="async"
      draggable={false}
      sizes={imageSizes}
      src={SD}
      // It's intended to keep `src` the last attribute because React updates
      // attributes in order.
      srcSet={imageSrcSet}
    />
  );
}
