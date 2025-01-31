'use client';

import {
  type ReactNode,
  type Ref,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import CircleButton from './CircleButton';
import DropdownContainer from '../Dropdown/DropdownContainer';

export type ContextMenuButtonHandle = Readonly<{
  close: () => void;
  open: () => void;
}>;

const contextMenuButtonStyles = cva('', {
  variants: {
    size: {
      small: ['size-8 md:size-8 [&_svg.icon]:size-6 md:[&_svg.icon]:size-7'],
      medium: ['size-10 md:size-12 [&_svg.icon]:size-7 md:[&_svg.icon]:size-9'],
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

type ButtonVariantProps = VariantProps<typeof contextMenuButtonStyles>;

export default function ContextMenuButton({
  className,
  classNameContainer,
  isDisabled,
  children,
  size,
  ref,
}: ButtonVariantProps &
  Readonly<{
    className?: string;
    classNameContainer?: string;
    isOpen?: boolean;
    isDisabled?: boolean;
    children: ReactNode;
    ref?: Ref<ContextMenuButtonHandle>;
  }>) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleOnClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      close: () => {
        setIsOpen(false);
      },
      open: () => {
        setIsOpen(true);
      },
    }),
    [],
  );

  return (
    <>
      <CircleButton
        ref={triggerRef}
        onClick={handleOnClick}
        isActive={isOpen}
        className={contextMenuButtonStyles({ className, size })}
        isDisabled={isDisabled}
      >
        <svg
          className="icon"
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
        {isOpen && (
          <DropdownContainer
            triggerRef={triggerRef}
            position={{
              x: 'center',
              y: 'center',
            }}
            offset={{
              x: 0,
              y: 0,
            }}
            onOutsideClick={() => setIsOpen(false)}
            variants={{
              visible: {
                opacity: 1,
                y: 0,
              },
              hidden: {
                opacity: 0,
                y: 0,
              },
            }}
          >
            <motion.div
              className={twMerge(
                'flex w-[230px] flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 text-neutral-700 shadow-lg',
                classNameContainer,
              )}
              initial={{ scale: 0 }}
              animate={{
                scale: 1,
                transformOrigin: 'center center',
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
              {children}
            </motion.div>
          </DropdownContainer>
        )}
      </AnimatePresence>
    </>
  );
}
