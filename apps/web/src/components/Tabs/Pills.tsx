'use client';

import { cva } from 'class-variance-authority';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

export const tabStyles = cva(
  'z-15 relative text-nowrap rounded-lg px-4 py-1.5 text-sm text-neutral-400 transition',
  {
    defaultVariants: {
      state: 'inactive',
    },
    variants: {
      state: {
        active: ['text-white'],
        inactive: ['hover:text-white/60'],
      },
    },
  },
);

export default function Pills({
  className,
  items,
  layoutId = 'pill',
}: Readonly<{
  className?: string;
  items: readonly { label: string; href: string }[];
  layoutId?: string;
}>) {
  const pathname = usePathname();

  return (
    <div
      className={twMerge(
        'rounded-lg bg-neutral-800/50 px-4 py-3 text-white/40',
        className,
      )}
    >
      <div className="scrollbar-hide flex flex-nowrap space-x-2 overflow-x-auto md:items-center md:justify-center">
        {items.map((item) => (
          <Link
            className={tabStyles({
              state: pathname === item.href ? 'active' : 'inactive',
            })}
            href={item.href}
            key={item.label}
          >
            {pathname === item.href && (
              <motion.span
                className="absolute inset-0 z-10 rounded-lg bg-white/15"
                layoutId={layoutId}
                transition={{ bounce: 0.2, duration: 0.6, type: 'spring' }}
              />
            )}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
