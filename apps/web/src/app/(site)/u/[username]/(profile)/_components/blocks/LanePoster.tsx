import Image from 'next/image';

import cn from '@/lib/cn';

/** A lane row's 2:3 poster (34px in Out now, 36px on Coming up's tickets, 48px in You both watch) */
export default function LanePoster({
  className,
  src,
  width,
}: Readonly<{
  className?: string;
  src: string;
  width: 34 | 36 | 40 | 48 | 56;
}>) {
  const height = Math.round((width * 3) / 2);
  const classes = cn(
    'shrink-0 rounded-[5px] bg-white/6 object-cover',
    className,
  );
  const style = { height, width };
  return src ? (
    <Image
      alt=""
      className={classes}
      height={height}
      src={src}
      style={style}
      width={width}
    />
  ) : (
    <span aria-hidden="true" className={classes} style={style} />
  );
}
