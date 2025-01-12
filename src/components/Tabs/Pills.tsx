'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

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
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide md:items-center md:justify-center">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`${
              pathname === item.href ? 'text-white' : 'hover:text-white/60'
            } z-15 relative rounded-lg px-4 py-1.5 text-sm text-neutral-400 transition`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {pathname === item.href && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 z-10 rounded-lg bg-white/15"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}