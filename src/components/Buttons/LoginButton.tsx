'use client';

import React, { useTransition, memo } from 'react';

import { motion } from 'framer-motion';

import { login, logout } from '@/app/actions';

const firstTextVariant = {
  initial: {
    y: 0,
  },
  hover: {
    y: -20,
    opacity: 0,
    transition: {
      duration: 1.125,
      ease: [0.19, 1, 0.22, 1],
    },
  },
  animate: {
    y: 0,
    transition: {
      duration: 1.125,
      ease: [0.19, 1, 0.22, 1],
    },
  },
};

const secondTextVariant = {
  initial: {
    y: 20,
    opacity: 0,
  },
  hover: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 1.125,
      ease: [0.19, 1, 0.22, 1],
    },
  },
  animate: {
    y: 20,
    opacity: 0,
  },
};

const LoginButton = ({
  profileName,
}: Readonly<{
  profileName?: string;
}>) => {
  const [isPending, startTransition] = useTransition();
  const handleClick = () => {
    startTransition(async () => {
      try {
        if (profileName) {
          await logout();
        } else {
          if (typeof window !== 'undefined') {
            await login(window.location.pathname);
          } else {
            await login();
          }
        }
      } catch (error) {}
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      className="relative flex h-[18px] w-auto min-w-12 items-center justify-end overflow-hidden text-base lowercase leading-none text-white"
      whileHover={profileName ? 'hover' : 'initial'}
      initial="initial"
    >
      {isPending ? (
        <motion.svg
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
        </motion.svg>
      ) : (
        <>
          <motion.span
            className="relative h-full truncate text-ellipsis"
            variants={firstTextVariant}
          >
            {profileName ? profileName : 'Login'}
          </motion.span>
          {profileName && (
            <motion.span
              variants={secondTextVariant}
              className="absolute right-0 top-0"
            >
              Logout
            </motion.span>
          )}
        </>
      )}
    </motion.button>
  );
};

export default memo(LoginButton);
