'use client';

import { memo } from 'react';

import { type Genre } from '@tvseri.es/types';
import { cva } from 'class-variance-authority';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import Link from 'next/link';

import noise from '@/assets/noise.webp';

const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const Noise = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] transform opacity-10 [mask-image:radial-gradient(#fff,transparent,75%)]"
      style={{
        backgroundImage: `url(${noise.src})`,
        backgroundSize: '30%',
      }}
    />
  );
};

export const genreStyles = cva(
  'relative select-none flex aspect-video w-[calc(100vw-4rem)] flex-shrink-0 transform-gpu cursor-pointer items-end overflow-hidden rounded-lg p-8 shadow-lg md:w-96',
);

const MotionLink = motion.create(Link);

function GenreTile({
  genre,
}: Readonly<{
  genre: Genre;
}>) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (event: React.MouseEvent) => {
    const { left, top } = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - left;
    const y = event.clientY - top;

    mouseX.set(x);
    mouseY.set(y);
  };

  const backgroundStyle = useMotionTemplate`radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 75%)`;

  return (
    <MotionLink
      href={`/discover?with_genres=${genre.id}`}
      className={genreStyles()}
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
      whileHover="visible"
      whileTap="visible"
      prefetch={false}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
      <motion.div
        className="absolute inset-0"
        style={{
          background: backgroundStyle,
        }}
        initial="hidden"
        animate="hidden"
        whileHover="visible"
        whileTap="visible"
        variants={variants}
      />
      <Noise />
      <div className="pointer-events-none relative w-full">
        <motion.div
          variants={{
            visible: { scaleY: 1.25, opacity: 1 },
          }}
          className="absolute -left-8 bottom-0 h-8 w-1 origin-center rounded-br-full rounded-tr-full bg-white opacity-20"
        />
        <motion.div
          variants={{
            visible: { x: 8 },
          }}
          className="flex h-8 w-full items-center font-medium drop-shadow-lg"
        >
          {genre.name}
        </motion.div>
      </div>
    </MotionLink>
  );
}

export default memo(GenreTile);
