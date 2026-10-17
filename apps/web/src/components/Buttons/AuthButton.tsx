'use client';

import { cva } from 'class-variance-authority';
import { memo, useTransition } from 'react';
import { toast } from 'sonner';

import { logout } from '@/app/actions';

import { loginFromHere } from '../Auth/loginFromHere';
import LoadingDots from '../LoadingDots/LoadingDots';

const loginButtonStyles = cva(
  'relative flex items-center justify-end text-3xl lowercase md:leading-none text-white md:text-base md:h-[18px] h-[36px]',
  {
    defaultVariants: {
      state: 'unauthenticated',
    },
    variants: {
      state: {
        authenticated: ['md:w-[48px] w-[89px]'],
        unauthenticated: ['md:w-[37px] w-[69px]'],
      },
    },
  },
);

const AuthButton = ({
  isAuthenticated,
  onLogout,
}: Readonly<{
  isAuthenticated?: boolean;
  onLogout?: () => void;
}>) => {
  const [isPending, startTransition] = useTransition();
  const handleClick = () => {
    if (!isAuthenticated) {
      startTransition(loginFromHere);
      return;
    }
    startTransition(async () => {
      try {
        await logout();
        onLogout?.();
      } catch {
        toast.error('Something went wrong. Please try again.');
      }
    });
  };

  return (
    <button
      className={loginButtonStyles({
        state: isAuthenticated ? 'authenticated' : 'unauthenticated',
      })}
      onClick={handleClick}
    >
      {isPending ? (
        <LoadingDots />
      ) : (
        <span>{isAuthenticated ? 'Logout' : 'Login'}</span>
      )}
    </button>
  );
};

AuthButton.displayName = 'AuthButton';

export default memo(AuthButton);
