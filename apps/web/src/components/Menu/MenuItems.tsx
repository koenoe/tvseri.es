'use client';

import { motion } from 'motion/react';

import AuthButton from '../Buttons/AuthButton';
import MenuItem from './MenuItem';
import useMenuUsername from './useMenuUsername';

const buttonVariants = {
  hidden: (i: number) => ({
    opacity: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.2,
    },
    y: -20,
  }),
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.2,
    },
    y: 0,
  }),
};

function MenuItemsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index, array) => (
        <motion.div
          animate="visible"
          className={'h-[30px] w-32 md:h-[18px] md:w-16'}
          custom={array.length - index}
          exit="hidden"
          initial="hidden"
          key={index}
          variants={buttonVariants}
        >
          <span className="block h-full w-full animate-pulse bg-white/30" />
        </motion.div>
      ))}
    </>
  );
}

export default function MenuItems({
  isMobile,
  onLogout,
  onItemClick,
}: Readonly<{
  isMobile: boolean;
  onLogout: () => void;
  onItemClick: () => void;
}>) {
  const username = useMenuUsername();

  // Only before hydration; the menu opens after it.
  if (username === undefined) {
    return <MenuItemsSkeleton />;
  }

  const showAuthButton = username || isMobile;
  const showProfileItem = username && isMobile;
  const isAuthenticated = !!username;

  const items = [
    { component: null, href: '/', label: 'Home' },
    { component: null, href: '/discover', label: 'Discover' },
    ...(showProfileItem
      ? [
          {
            component: null,
            href: `/u/${username}`,
            label: 'Profile',
          },
        ]
      : []),
    ...(username
      ? [
          {
            component: null,
            href: '/settings',
            label: 'Settings',
          },
        ]
      : []),
    ...(showAuthButton
      ? [
          {
            component: (
              <AuthButton
                isAuthenticated={isAuthenticated}
                onLogout={onLogout}
              />
            ),
            href: '',
            label: '',
          },
        ]
      : []),
  ];

  return (
    <>
      {items.map((item, index, array) => (
        <motion.div
          animate="visible"
          className="md:h-[18px] md:min-w-12"
          custom={array.length - index}
          exit="hidden"
          initial="hidden"
          key={index}
          variants={buttonVariants}
        >
          {item.component ? (
            item.component
          ) : (
            <MenuItem
              href={item.href}
              label={item.label}
              onClick={onItemClick}
            />
          )}
        </motion.div>
      ))}
    </>
  );
}
