'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import useMatchMedia from '@/hooks/useMatchMedia';
import { type User } from '@/types/user';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';

import MenuToggle, { type MenuToggleHandle } from './MenuToggle';
import Modal from '../Modal';
import MenuItem from './MenuItem';
import AuthButton from '../Buttons/AuthButton';
import Search from '../Search/Search';

const fetchAccount = async () => {
  const response = await fetch('/api/account');
  const json = (await response.json()) as User;
  return json;
};

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

export default function Menu({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const menuToggleRef = useRef<MenuToggleHandle>(null);
  const accountIsFetched = useRef(false);
  const [account, setAccount] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000');
  const isMobile = useMatchMedia('(max-width: 768px)');

  const handleMenuToggle = useCallback((open: boolean) => {
    setBackgroundColor(getMainBackgroundColor());
    setMenuOpen(open);
  }, []);

  const handleLogout = useCallback(() => {
    setAccount(null);
    setMenuOpen(false);
    menuToggleRef.current?.close();
    router.refresh();
  }, [router]);

  const handleMenuItemClick = useCallback(() => {
    setMenuOpen(false);
    menuToggleRef.current?.close();
  }, []);

  const renderMenu = useCallback(() => {
    const showAuthButton = account || isMobile;
    const showProfileItem = account && isMobile;
    const isAuthenticated = !!account;
    const items = [
      { label: 'Home', href: '/', component: null },
      { label: 'Discover', href: '/discover', component: null },
      ...(showProfileItem
        ? [
            {
              label: 'Profile',
              href: `/u/${account.username}`,
            },
          ]
        : []),
      ...(account
        ? [
            {
              label: 'Settings',
              href: '/settings',
              component: null,
            },
          ]
        : []),
      ...(showAuthButton
        ? [
            {
              label: '',
              href: '',
              component: (
                <AuthButton
                  isAuthenticated={isAuthenticated}
                  onLogout={handleLogout}
                />
              ),
            },
          ]
        : []),
    ];

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
        <div className="fixed inset-0 z-30 md:relative md:inset-auto">
          <motion.div
            key="menu"
            className="absolute inset-0 flex flex-col items-center justify-center gap-8 md:inset-auto md:right-0 md:top-0 md:flex-row md:justify-normal"
          >
            {isPending
              ? Array.from({ length: 5 }).map((_, index, array) => (
                  <motion.div
                    key={index}
                    className={'h-[30px] w-32 md:h-[18px] md:w-16'}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    custom={array.length - index}
                    variants={buttonVariants}
                  >
                    <span className="block h-full w-full animate-pulse bg-white/30" />
                  </motion.div>
                ))
              : items.map((item, index, array) => (
                  <motion.div
                    key={index}
                    className="md:h-[18px] md:min-w-12"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    custom={array.length - index}
                    variants={buttonVariants}
                  >
                    {item.component ? (
                      item.component
                    ) : (
                      <MenuItem
                        label={item.label}
                        href={item.href}
                        onClick={handleMenuItemClick}
                      />
                    )}
                  </motion.div>
                ))}
          </motion.div>
        </div>
      </>
    );
  }, [
    account,
    isMobile,
    isPending,
    backgroundColor,
    handleLogout,
    handleMenuItemClick,
  ]);

  // Note: ideally we don't do this, but if we do this with RSC + Suspense
  // we'll get nested suspense due to `<Username />` being suspensed too.
  // this then causes a long delay in rendering the menu
  // cause it waits for `<Username />` to resolve before rendering the menu
  useEffect(() => {
    if (isPending || accountIsFetched.current) {
      return;
    }

    startTransition(async () => {
      try {
        const account = await fetchAccount();
        setAccount(account);
      } catch (_error) {}

      accountIsFetched.current = true;
    });
  }, [isPending]);

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
