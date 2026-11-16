import type { Metadata } from 'next';

import { type ProfileParams, profileMetadata } from '../_data/profile';
import ShelfPage from './_components/ShelfPage';
import type { ShelfRouteProps } from './_components/shelfRoute';

export function generateMetadata({
  params,
}: Readonly<{ params: ProfileParams }>): Promise<Metadata> {
  return profileMetadata(params, (username) => `@${username}’s library`);
}

/**
 * `/library`, the Library tab (renders, no redirect): your own
 * opens on Watching, someone else's on Favourites, day 0 on the first shelf
 * with something on it.
 */
export default function LibraryPage({ params, searchParams }: ShelfRouteProps) {
  return <ShelfPage params={params} searchParams={searchParams} shelf={null} />;
}
