'use client';

import { Fragment } from 'react';

import { useSearchParams } from 'next/navigation';

export default function SearchParamsWrapper({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const searchParams = useSearchParams();

  return <Fragment key={searchParams.toString()}>{children}</Fragment>;
}
