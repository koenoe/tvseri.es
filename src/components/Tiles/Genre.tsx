'use client';

import React, { memo, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Genre } from '@/types/genre';

const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const Noise = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] transform opacity-10 [mask-image:radial-gradient(#fff,transparent,75%)]"
      style={{
        backgroundImage: 'url(/noise.webp)',
        backgroundSize: '30%',
      }}
    ></div>
  );
};

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
    <motion.div
      className="relative flex aspect-video w-[calc(100vw-4rem)] flex-shrink-0 cursor-pointer items-end overflow-hidden rounded-lg p-8 shadow-lg md:w-96"
      onMouseMove={handleMouseMove}
      whileHover="visible"
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
        variants={variants}
      />
      <Noise />
      <span className="pointer-events-none font-medium drop-shadow-lg">
        {genre.name}
      </span>
    </motion.div>
  );
}

export default memo(GenreTile);
