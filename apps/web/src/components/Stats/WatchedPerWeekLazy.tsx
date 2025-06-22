'use client';

import dynamic from 'next/dynamic';

import { type Props } from './WatchedPerWeek';

const WatchedPerWeek = dynamic(() => import('./WatchedPerWeek'), {
  ssr: false,
});

export default function WatchedPerWeekLazy(props: Props) {
  return <WatchedPerWeek {...props} />;
}
