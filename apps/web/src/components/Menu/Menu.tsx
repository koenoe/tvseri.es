'use client';

import type { User } from '@tvseri.es/schemas';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useRef, useState } from 'react';

import useMatchMedia from '@/hooks/useMatchMedia';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';
import Modal from '../Modal';
import Search from '../Search/Search';
import MenuItems, { MenuItemsSkeleton } from './MenuItems';
import MenuToggle, { type MenuToggleHandle } from './MenuToggle';

export default function Menu({
  children,
  authPromise,
}: Readonly<{
  children: React.ReactNode;
  authPromise: Promise<{ user: User | null }>;
}>) {
  const router = useRouter();
  const menuToggleRef = useRef<MenuToggleHandle>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000');
  const isMobile = useMatchMedia('(max-width: 768px)');

  const handleMenuToggle = useCallback((open: boolean) => {
    setBackgroundColor(getMainBackgroundColor());
    setMenuOpen(open);
  }, []);

  const handleLogout = useCallback(() => {
    setMenuOpen(false);
    menuToggleRef.current?.close();
    router.refresh();
  }, [router]);

  const handleMenuItemClick = useCallback(() => {
    setMenuOpen(false);
    menuToggleRef.current?.close();
  }, []);

  const renderMenu = useCallback(() => {
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
            <Suspense fallback={<MenuItemsSkeleton />}>
              <MenuItems
                authPromise={authPromise}
                isMobile={isMobile}
                onItemClick={handleMenuItemClick}
                onLogout={handleLogout}
              />
            </Suspense>
          </motion.div>
        </div>
      </>
    );
  }, [
    backgroundColor,
    authPromise,
    isMobile,
    handleLogout,
    handleMenuItemClick,
  ]);

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
