'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import Link, { type LinkProps } from 'next/link';

import useMatchMedia from '@/hooks/useMatchMedia';
import { type Account } from '@/types/account';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';

import MenuToggle, { type MenuToggleHandle } from './MenuToggle';
import LoginButton from '../Buttons/LoginButton';
import Modal from '../Modal';
import Search from '../Search/Search';

const fetchAccount = async () => {
  const response = await fetch('/api/account');
  const json = (await response.json()) as Account;
  return json;
};

const MotionLink = motion(Link);

const buttonVariants = {
  hidden: (i: number) => ({
    opacity: 0,
    y: -20,
    transition: {
      delay: i * 0.1,
      duration: 0.2,
    },
  }),
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.2,
    },
  }),
};

const MenuItem = ({
  onClick,
  href,
  custom,
  label,
}: LinkProps &
  Readonly<{
    label: string;
    custom: number;
  }>) => {
  return (
    <MotionLink
      href={href}
      className="relative flex h-auto w-auto items-center overflow-hidden text-3xl lowercase leading-none text-white md:h-[18px] md:min-w-12 md:justify-end md:text-base md:leading-none"
      initial="hidden"
      animate="visible"
      exit="hidden"
      custom={custom}
      variants={buttonVariants}
      onClick={onClick}
    >
      <span className="relative h-full truncate text-ellipsis">{label}</span>
    </MotionLink>
  );
};

export default function Menu({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const menuToggleRef = useRef<MenuToggleHandle>(null);
  const accountIsFetched = useRef(false);
  const accountIsFetching = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000');
  const isMobile = useMatchMedia('(max-width: 768px)');

  const handleMenuToggle = useCallback((open: boolean) => {
    setBackgroundColor(getMainBackgroundColor());
    setMenuOpen(open);
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setMenuOpen(false);
    menuToggleRef.current?.close();
  }, []);

  const handleMenuItemClick = useCallback(() => {
    setMenuOpen(false);
    menuToggleRef.current?.close();
  }, []);

  const renderMenu = useCallback(() => {
    const showLoginButton = isAuthenticated || isMobile;
    return (
      <>
        <motion.div
          style={{
            backgroundColor,
          }}
          className="fixed inset-0 z-20 md:hidden"
          key="menu-backdrop"
          variants={{
            hidden: {
              opacity: 0,
              transition: {
                duration: 0.25,
                delay: 0.5,
              },
            },
            visible: {
              opacity: 0.9,
              transition: {
                duration: 0.25,
              },
            },
          }}
          initial="hidden"
          exit="hidden"
          animate="visible"
        />
        <div className="fixed inset-0 z-30 md:relative md:inset-auto md:bg-transparent">
          <motion.div
            key="menu"
            className="absolute inset-0 flex flex-col items-center justify-center gap-8 md:inset-auto md:right-0 md:top-0 md:flex-row md:justify-normal"
          >
            {[
              { label: 'Home', href: '/' },
              { label: 'Discover', href: '/discover' },
              ...(isAuthenticated
                ? [
                    { label: 'Watchlist', href: '/watchlist' },
                    { label: 'Favorites', href: '/favorites' },
                  ]
                : []),
            ].map((item, index, array) => (
              <MenuItem
                key={index}
                label={item.label}
                custom={
                  showLoginButton
                    ? array.length - index + 1
                    : array.length - index
                }
                href={item.href}
                onClick={handleMenuItemClick}
              />
            ))}

            {showLoginButton && (
              <motion.div
                key="login"
                initial="hidden"
                animate="visible"
                exit="hidden"
                custom={0}
                variants={buttonVariants}
              >
                <LoginButton
                  isAuthenticated={isAuthenticated}
                  onLogout={handleLogout}
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </>
    );
  }, [
    isAuthenticated,
    isMobile,
    backgroundColor,
    handleLogout,
    handleMenuItemClick,
  ]);

  // Note: ideally we don't do this, but if we do this with RSC + Suspense
  // we'll get nested suspense due to `<Username />` being suspensed too.
  // this then causes a long delay in rendering the menu
  // cause it waits for `<Username />` to resolve before rendering the menu
  useEffect(() => {
    if (!accountIsFetched.current && !accountIsFetching.current) {
      accountIsFetching.current = true;
      fetchAccount()
        .then((account) => {
          setIsAuthenticated(!!account);
        })
        .finally(() => {
          accountIsFetched.current = true;
          accountIsFetching.current = false;
        });
    }
  }, []);

  return (
    <div className="ml-auto flex items-center gap-10">
      <div className="relative h-[18px] w-auto">
        <AnimatePresence initial={false}>
          {menuOpen && (
            <>{isMobile ? <Modal>{renderMenu()}</Modal> : renderMenu()}</>
          )}

          {!menuOpen && (
            <motion.div
              className="absolute right-0 top-0 z-10 hidden md:block"
              key="children"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0, y: 20, transition: { duration: 0.2 } },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.2, delay: 0.2 },
                },
              }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex items-center">
        <Search />
        <MenuToggle ref={menuToggleRef} onClick={handleMenuToggle} />
      </div>
    </div>
  );
}
