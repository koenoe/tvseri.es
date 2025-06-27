'use client';

import { cva } from 'class-variance-authority';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

export const tabStyles = cva('relative inline-block p-4 text-nowrap', {
  defaultVariants: {
    state: 'inactive',
  },
  variants: {
    state: {
      active: ['text-white'],
      inactive: ['hover:text-white/60'],
    },
  },
});

export default function Tabs({
  className,
  items,
  layoutId = 'line',
}: Readonly<{
  className?: string;
  items: readonly { label: string; href: string }[];
  layoutId?: string;
}>) {
  const pathname = usePathname();

  return (
    <div
      className={twMerge(
        'scrollbar-hide overflow-x-auto border-b border-white/10 text-sm text-white/40',
        className,
      )}
    >
      <ul className="-mb-px flex flex-nowrap">
        {items.map((item) => (
          <li className="me-2" key={item.label}>
            <Link
              className={tabStyles({
                state: pathname === item.href ? 'active' : 'inactive',
              })}
              href={item.href}
            >
              {item.label}
              {pathname === item.href && (
                <motion.span
                  className="absolute bottom-0 left-0 z-10 h-[3px] w-full bg-white"
                  layoutId={layoutId}
                  transition={{ bounce: 0.2, duration: 0.6, type: 'spring' }}
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
