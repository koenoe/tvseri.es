'use client';

import { createPortal } from 'react-dom';

import { usePreventScroll } from '@/hooks/usePreventScroll';

const Modal = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  usePreventScroll();

  return createPortal(children, document.getElementById('modal-root')!);
};

export default Modal;
