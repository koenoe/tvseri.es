'use client';

import type { Genre } from '@tvseri.es/schemas';
import { cva } from 'class-variance-authority';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { memo } from 'react';

const Noise = dynamic(() => import('./Noise'), {
  ssr: false,
});

const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const genreStyles = cva(
  'relative select-none flex aspect-video w-[calc(100vw-4rem)] flex-shrink-0 transform-gpu cursor-pointer items-end overflow-hidden rounded-xl p-8 shadow-lg md:w-96',
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
      className={genreStyles()}
      href={{
        pathname: '/discover',
        query: { with_genres: genre.id },
      }}
      onClick={handleMouseMove}
      onMouseMove={handleMouseMove}
      prefetch={false}
      whileHover="visible"
      whileTap="visible"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
      <motion.div
        animate="hidden"
        className="absolute inset-0"
        initial="hidden"
        style={{
          background: backgroundStyle,
        }}
        variants={variants}
        whileHover="visible"
        whileTap="visible"
      />
      <Noise />
      <div className="pointer-events-none relative w-full">
        <motion.div
          className="absolute -left-8 bottom-0 h-8 w-1 origin-center rounded-br-full rounded-tr-full bg-white opacity-20"
          variants={{
            visible: { opacity: 1, scaleY: 1.25 },
          }}
        />
        <motion.div
          className="flex h-8 w-full items-center font-medium drop-shadow-lg"
          variants={{
            visible: { x: 8 },
          }}
        >
          {genre.name}
        </motion.div>
      </div>
    </MotionLink>
  );
}

export default memo(GenreTile);
