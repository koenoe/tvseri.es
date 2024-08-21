import { Suspense } from 'react';

import { cookies } from 'next/headers';

import Menu from './Menu';
import Username from './Username';

export default function MenuContainer() {
  const isAuthenticated = !!cookies().get('sessionId')?.value;

  return (
    <Menu isAuthenticated={isAuthenticated}>
      <Suspense
        fallback={<div className="h-[18px] w-14 animate-pulse bg-white/30" />}
      >
        <Username />
      </Suspense>
    </Menu>
  );
}
