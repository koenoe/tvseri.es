import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The internal `/dev` pages (the style guide, Home's parts): in `next dev`,
 * and in the e2e build, which compiles in Next's testing API
 * (`EXPOSE_TESTING_API=1`; the specs pin Home's moments through
 * `/dev/home?day=`). Every other production build 404s.
 */
export default function DevLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.EXPOSE_TESTING_API !== '1'
  ) {
    notFound();
  }
  return children;
}
