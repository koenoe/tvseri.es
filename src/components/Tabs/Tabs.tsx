import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';

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

export const menuItems = [
  // {
  //   id: 'profile',
  //   label: 'Profile',
  //   href: '/settings/profile',
  // },
  {
    id: 'import',
    label: 'Import',
    href: '/settings/import',
  },
  // {
  //   id: 'webhooks',
  //   label: 'Webhooks',
  //   href: '/settings/webhooks',
  // },
] as const;

export const tabs = menuItems.map((item) => item.id);
export type Tab = (typeof tabs)[number];

export default function Tabs({ activeTab }: Readonly<{ activeTab: Tab }>) {
  return (
    <div className="overflow-x-auto border-b border-white/10 text-sm text-white/40 scrollbar-hide">
      <ul className="-mb-px flex flex-nowrap">
        {menuItems.map((item) => (
          <li key={item.id} className="me-2">
            <Link
              href={item.href}
              className={tabStyles({
                state: activeTab === item.id ? 'active' : 'inactive',
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
