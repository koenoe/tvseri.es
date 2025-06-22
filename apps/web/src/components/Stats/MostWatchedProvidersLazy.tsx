'use client';

import dynamic from 'next/dynamic';

import { type Props } from './MostWatchedProviders';

const MostWatchedProviders = dynamic(() => import('./MostWatchedProviders'), {
  ssr: false,
});

export default function MostWatchedProvidersLazy(props: Props) {
  return <MostWatchedProviders {...props} />;
}
