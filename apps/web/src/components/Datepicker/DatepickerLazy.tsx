'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import type { Props } from './Datepicker';

const Datepicker = dynamic(() => import('./Datepicker'), {
  ssr: false,
});

export default function DatepickerLazy(props: Props) {
  return (
    <Suspense fallback={<div className={props.className} />}>
      <Datepicker {...props} />
    </Suspense>
  );
}
