'use client';

import React, { memo } from 'react';

import { motion } from 'framer-motion';
import Image from 'next/image';

import { type Person } from '@/types/person';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const MotionImage = motion(Image);

function Avatars({
  className,
  items,
}: Readonly<{ className?: string; items: Person[] }>) {
  return (
    <div className="my-14 flex w-full flex-row flex-wrap xl:w-4/5 2xl:w-3/5">
      {/* TODO: add links to person page eventually */}
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="relative -mr-4 -mt-4 flex h-20 w-20 transform-gpu cursor-pointer flex-col"
          initial="inactive"
          whileHover="active"
          variants={{
            inactive: { zIndex: 0 },
            active: { zIndex: 10 },
          }}
        >
          <MotionImage
            src={item.image}
            alt={item.name}
            className="h-full w-full rounded-full border-2 border-white object-cover object-top"
            priority
            placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(200, 200)}`}
            width={200}
            height={200}
            variants={{
              inactive: { scale: 1 },
              active: { scale: 1.25 },
            }}
          />
          <motion.div
            className="mt-5 flex w-full flex-col items-center gap-1 text-nowrap drop-shadow-xl"
            variants={{
              inactive: { opacity: 0, y: -15 },
              active: { opacity: 1, y: 0 },
            }}
          >
            <div className="text-sm font-semibold">{item.name}</div>
            <div className="text-xs opacity-60">
              {item.character ?? item.job}
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

export default memo(Avatars);
