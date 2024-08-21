import { Suspense } from 'react';

import { cookies } from 'next/headers';

import Menu from './Menu';
import Username from './Username';

export default async function MenuContainer() {
  const isAuthenticated = !!cookies().get('sessionId')?.value;

  return (
    <Menu isAuthenticated={isAuthenticated}>
      <Suspense
        fallback={<div className="h-[18px] w-16 animate-pulse bg-white/30" />}
      >
        <Username />
      </Suspense>
    </Menu>
  );
}
