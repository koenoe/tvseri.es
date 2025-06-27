'use client';

import type { User } from '@tvseri.es/types';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import useMatchMedia from '@/hooks/useMatchMedia';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';
import AuthButton from '../Buttons/AuthButton';
import Modal from '../Modal';
import Search from '../Search/Search';
import MenuItem from './MenuItem';
import MenuToggle, { type MenuToggleHandle } from './MenuToggle';

const fetchAccount = async () => {
  const response = await fetch('/api/account');
  const json = (await response.json()) as User;
  return json;
};

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
      { component: null, href: '/', label: 'Home' },
      { component: null, href: '/discover', label: 'Discover' },
      ...(showProfileItem
        ? [
            {
              href: `/u/${account.username}`,
              label: 'Profile',
            },
          ]
        : []),
      ...(account
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
                  onLogout={handleLogout}
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
        <motion.div
          animate="visible"
          className="fixed inset-0 z-20 md:hidden"
          exit="hidden"
          initial="hidden"
          key="menu-backdrop"
          style={{
            backgroundColor,
          }}
          variants={{
            hidden: {
              opacity: 0,
              transition: {
                delay: 0.5,
                duration: 0.25,
              },
            },
            visible: {
              opacity: 0.9,
              transition: {
                duration: 0.25,
              },
            },
          }}
        />
        <div className="fixed inset-0 z-30 md:relative md:inset-auto">
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-8 md:inset-auto md:right-0 md:top-0 md:flex-row md:justify-normal"
            key="menu"
          >
            {isPending
              ? Array.from({ length: 4 }).map((_, index, array) => (
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
                ))
              : items.map((item, index, array) => (
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
          {menuOpen &&
            (isMobile ? <Modal>{renderMenu()}</Modal> : renderMenu())}

          {!menuOpen && (
            <motion.div
              animate="visible"
              className="absolute right-0 top-0 z-10 hidden md:block"
              exit="hidden"
              initial="hidden"
              key="children"
              variants={{
                hidden: { opacity: 0, transition: { duration: 0.2 }, y: 20 },
                visible: {
                  opacity: 1,
                  transition: { delay: 0.2, duration: 0.2 },
                  y: 0,
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
        <MenuToggle onClick={handleMenuToggle} ref={menuToggleRef} />
      </div>
    </div>
  );
}
