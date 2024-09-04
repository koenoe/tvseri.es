/* eslint-disable @next/next/no-img-element */
import { preload } from 'react-dom';

export default function BackgroundImage({
  src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  ...rest
}: React.AllHTMLAttributes<HTMLImageElement>) {
  const HD = src;
  const SD = src.replace(
    'w1920_and_h1080_multi_faces',
    'w1280_and_h720_multi_faces',
  );
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
    <>
      <img
        className="h-full w-full object-cover object-top"
        decoding="async"
        src={SD}
        alt=""
        draggable={false}
        srcSet={imageSrcSet}
        sizes={imageSizes}
        {...rest}
      />
    </>
  );
}
