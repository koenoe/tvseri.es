'use client';

import type { Person } from '@tvseri.es/schemas';
import { cva, cx } from 'class-variance-authority';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';

import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

const MotionImage = motion.create(Image);
const MotionLink = motion.create(Link);

export const avatarsStyles = cva(
  'grid grid-cols-3 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap gap-4 lg:gap-0 [&>*:nth-child(n+7)]:hidden md:[&>*:nth-child(n+7)]:flex lg:min-h-36',
);

export const avatarStyles = cva(
  'relative w-full flex lg:pt-0 lg:w-24 transform-gpu cursor-pointer flex-col lg:-mr-4 lg:-mt-4',
);

function Avatar({ item }: Readonly<{ item: Person }>) {
  return (
    <MotionLink
      className={avatarStyles()}
      href={{
        pathname: `/person/${item.id}/${item.slug}`,
      }}
      initial="inactive"
      key={item.id}
      layout
      variants={{
        active: { zIndex: 10 },
        inactive: { zIndex: 0 },
      }}
      whileHover="active"
    >
      <MotionImage
        alt={item.name}
        className="mx-auto aspect-square h-auto w-full rounded-full border-2 border-white object-cover lg:h-24"
        height={200}
        placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(200, 200)}`}
        priority
        src={item.image}
        unoptimized
        variants={{
          active: { scale: 1.15 },
          inactive: { scale: 1 },
        }}
        width={200}
      />

      <motion.div
        className="mt-4 hidden w-full flex-col items-center gap-1 text-nowrap text-center lg:flex"
        variants={{
          active: { opacity: 1, y: 0 },
          inactive: { opacity: 0, y: -15 },
        }}
      >
        <div className="text-sm font-semibold">{item.name}</div>
        <div className="text-xs opacity-60">{item.character ?? item.job}</div>
      </motion.div>

      <div className="mt-2 flex flex-col items-center gap-1 text-center lg:hidden">
        <div className="text-sm font-semibold">{item.name}</div>
        <div className="text-xs opacity-60">{item.character ?? item.job}</div>
      </div>
    </MotionLink>
  );
}

function Avatars({
  className,
  items,
}: Readonly<{ className?: string; items: Person[] }>) {
  return (
    <div className={cx(avatarsStyles(), className)}>
      {items.map((item) => (
        <Avatar item={item} key={item.id} />
      ))}
    </div>
  );
}

export default memo(Avatars);
