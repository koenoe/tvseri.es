'use client';

import { useTransition, memo } from 'react';

import { cva } from 'class-variance-authority';

import { login, logout } from '@/app/actions';

const loginButtonStyles = cva(
  'relative flex items-center justify-end text-3xl lowercase md:leading-none text-white md:text-base md:h-[18px] h-[36px]',
  {
    variants: {
      state: {
        authenticated: ['md:w-[48px] w-[89px]'],
        unauthenticated: ['md:w-[37px] w-[69px]'],
      },
    },
    defaultVariants: {
      state: 'unauthenticated',
    },
  },
);

const LoginButton = ({
  isAuthenticated,
  onLogout,
}: Readonly<{
  isAuthenticated?: boolean;
  onLogout?: () => void;
}>) => {
  const [isPending, startTransition] = useTransition();
  const handleClick = () => {
    startTransition(async () => {
      try {
        if (isAuthenticated) {
          await logout();
          onLogout?.();
        } else {
          // Note: we don't have an actual login page,
          // and we redirect to TMDb, so we don't have a login callback
          if (typeof window !== 'undefined') {
            await login(window.location.pathname);
          } else {
            await login();
          }
        }
      } catch (_error) {}
    });
  };

  return (
    <button
      onClick={handleClick}
      className={loginButtonStyles({
        state: isAuthenticated ? 'authenticated' : 'unauthenticated',
      })}
    >
      {isPending ? (
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          fill="#fff"
          viewBox="0 0 120 30"
        >
          <circle cx="15" cy="15" r="15">
            <animate
              attributeName="r"
              from="15"
              to="15"
              begin="0s"
              dur="0.8s"
              values="15;9;15"
              calcMode="linear"
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill-opacity"
              from="1"
              to="1"
              begin="0s"
              dur="0.8s"
              values="1;.5;1"
              calcMode="linear"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="60" cy="15" r="9" fillOpacity="0.3">
            <animate
              attributeName="r"
              from="9"
              to="9"
              begin="0s"
              dur="0.8s"
              values="9;15;9"
              calcMode="linear"
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill-opacity"
              from="0.5"
              to="0.5"
              begin="0s"
              dur="0.8s"
              values=".5;1;.5"
              calcMode="linear"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="105" cy="15" r="15">
            <animate
              attributeName="r"
              from="15"
              to="15"
              begin="0s"
              dur="0.8s"
              values="15;9;15"
              calcMode="linear"
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill-opacity"
              from="1"
              to="1"
              begin="0s"
              dur="0.8s"
              values="1;.5;1"
              calcMode="linear"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      ) : (
        <span>{isAuthenticated ? 'Logout' : 'Login'}</span>
      )}
    </button>
  );
};

export default memo(LoginButton);
