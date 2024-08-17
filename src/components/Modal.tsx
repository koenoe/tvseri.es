'use client';

import { useEffect } from 'react';

import { createPortal } from 'react-dom';

import { usePreventScroll } from '@/hooks/usePreventScroll';

const Modal = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  useEffect(() => {
    document.body.classList.add('modal-is-open');

    return () => {
      document.body.classList.remove('modal-is-open');
    };
  }, []);

  usePreventScroll();

  return createPortal(children, document.getElementById('modal-root')!);
};

export default Modal;
