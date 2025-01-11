'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const tabStyles = cva('inline-block rounded-t-lg border-b-2 p-4', {
  variants: {
    state: {
      active: ['border-white p-4 text-white'],
      inactive: ['border-transparent'],
    },
  },
  defaultVariants: {
    state: 'inactive',
  },
});

export type ButtonVariantProps = VariantProps<typeof tabStyles>;

export default function Tabs({
  items,
}: Readonly<{
  items: readonly { label: string; href: string }[];
}>) {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto border-b border-white/10 text-sm text-white/40 scrollbar-hide">
      <ul className="-mb-px flex flex-nowrap">
        {items.map((item) => (
          <li key={item.label} className="me-2">
            <Link
              href={item.href}
              className={tabStyles({
                state: pathname === item.href ? 'active' : 'inactive',
              })}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
