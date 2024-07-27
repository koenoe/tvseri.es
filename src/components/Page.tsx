import Image from 'next/image';
import hexToRgb from '@/utils/hexToRgb';

export default function Page({
  backgroundColor,
  backgroundImage,
  children,
}: Readonly<{
  backgroundColor: string;
  backgroundImage: string;
  children: React.ReactNode;
}>) {
  const [r, g, b] = hexToRgb(backgroundColor);
  const rgbForRgba = `${r},${g},${b}`;

  return (
    <main
      // pt-[8rem] is the height of the header
      className="min-h-screen pt-[8rem] subpixel-antialiased"
      style={{ backgroundColor }}
    >
      <div className="absolute inset-0 z-0 transform-gpu">
        <Image
          className="object-cover opacity-30"
          src={backgroundImage}
          alt=""
          priority
          fill
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(rgba(${rgbForRgba}, 0) 0%, rgba(${rgbForRgba}, 1) 100%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '20%',
            width: '100%',
            backgroundImage: `linear-gradient(to top, ${backgroundColor}, ${backgroundColor} 50%, transparent)`,
          }}
        />
      </div>
      {children}
    </main>
  );
}
