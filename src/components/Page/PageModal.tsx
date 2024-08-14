'use client';

import { memo, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

import { type Props } from './Page';
import Background from '../Background/Background';

const transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.5,
};

const MotionBackground = motion(Background);

function PageModal({
  backgroundColor = '#000',
  backgroundImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  backgroundVariant = 'static',
  backgroundContext = 'page',
  children,
  id,
}: Props &
  Readonly<{
    id: string;
  }>) {
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`modal-${id}`}
        transition={{
          ...transition,
          when: 'afterChildren',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 overflow-y-auto pb-12"
        style={{
          backgroundColor,
        }}
      >
        <MotionBackground
          key={`modal-background-${id}`}
          variant={backgroundVariant}
          context={backgroundContext}
          color={backgroundColor}
          image={backgroundImage}
          transition={transition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          key={`modal-content-${id}`}
          transition={{
            ...transition,
            delay: 0.5,
            duration: 0.3,
          }}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          layout
        >
          {children}
        </motion.div>
        <button
          className="absolute left-5 top-5 bg-white p-2 text-black"
          onClick={() => router.back()}
        >
          Close
        </button>
      </motion.div>
    </AnimatePresence>,
    document.getElementById('modal-root')!,
  );
}

export default memo(PageModal);
