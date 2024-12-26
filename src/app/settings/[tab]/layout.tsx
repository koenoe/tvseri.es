import { type ReactNode } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';

import Page from '@/components/Page/Page';

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

export default async function SettingsLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<
    Readonly<{
      tab: string;
    }>
  >;
}>) {
  const { tab } = await params;

  return (
    <Page backgroundContext="dots">
      <div className="container">
        <div className="overflow-x-auto border-b border-white/10 text-sm text-white/40 scrollbar-hide">
          <ul className="-mb-px flex flex-nowrap">
            <li className="me-2">
              <Link
                href="/settings/profile"
                className={tabStyles({
                  state: tab === 'profile' ? 'active' : 'inactive',
                })}
              >
                Profile
              </Link>
            </li>
            <li className="me-2">
              <Link
                href="/settings/import"
                className={tabStyles({
                  state: tab === 'import' ? 'active' : 'inactive',
                })}
              >
                Import
              </Link>
            </li>
            <li className="me-2">
              <Link
                href="/settings/webhooks"
                className={tabStyles({
                  state: tab === 'webhooks' ? 'active' : 'inactive',
                })}
              >
                Webhooks
              </Link>
            </li>
          </ul>
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </Page>
  );
}
