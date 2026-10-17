'use client';

import { memo, useCallback, useTransition } from 'react';

import LoadingDots from '../LoadingDots/LoadingDots';
import { loginFromHere } from './loginFromHere';

function LoginButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = useCallback(() => {
    startTransition(loginFromHere);
  }, []);

  return (
    <button
      className="relative flex h-11 w-full max-w-48 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-neutral-900"
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {isPending ? <LoadingDots className="h-3 text-neutral-900" /> : 'Login'}
    </button>
  );
}

LoginButton.displayName = 'LoginButton';

export default memo(LoginButton);
