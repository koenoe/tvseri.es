'use client';

import dynamic from 'next/dynamic';

import { type Props } from './MostWatchedGenres';

const MostWatchedGenres = dynamic(() => import('./MostWatchedGenres'), {
  ssr: false,
});

export default function MostWatchedGenresLazy(props: Props) {
  return <MostWatchedGenres {...props} />;
}
