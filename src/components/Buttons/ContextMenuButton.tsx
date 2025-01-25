'use client';

import { useCallback, useState, useTransition } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

import CircleButton from './CircleButton';

export default function ContextMenuButton({
  className,
  isActive: isActiveFromProps = false,
}: Readonly<{
  className?: string;
  isActive?: boolean;
}>) {
  const [isActive, setIsActive] = useState(isActiveFromProps);
  const [isPending, startTransition] = useTransition();

  const handleOnClick = useCallback((value: boolean) => {
    setIsActive(value);
  }, []);

  return (
    <div className="relative">
      <CircleButton
        className={className}
        onClick={handleOnClick}
        isActive={isActive}
        isDisabled={isPending}
      >
        <svg
          className="size-9"
          viewBox="0 0 25 25"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6.5 11C7.32843 11 8 11.6716 8 12.5C8 13.3284 7.32843 14 6.5 14C5.67157 14 5 13.3284 5 12.5C5 11.6716 5.67157 11 6.5 11Z" />
          <path d="M12.5 11C13.3284 11 14 11.6716 14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11Z" />
          <path d="M18.5 11C19.3284 11 20 11.6716 20 12.5C20 13.3284 19.3284 14 18.5 14C17.6716 14 17 13.3284 17 12.5C17 11.6716 17.6716 11 18.5 11Z" />
        </svg>
      </CircleButton>
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40"
              onClick={() => setIsActive(false)}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex h-48 w-48 flex-col items-center gap-2 rounded-lg bg-white p-4 text-neutral-900 shadow-lg"
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    mass: 1,
                    duration: 0.3,
                  },
                }}
                exit={{
                  scale: 0,
                  transition: {
                    duration: 0.2,
                  },
                }}
              >
                <Link href="#" className="text-sm">
                  Mark as watched
                </Link>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
