'use client';

import { createPortal } from 'react-dom';

const Modal = ({ children }: Readonly<{ children: React.ReactNode }>) =>
  createPortal(children, document.getElementById('modal-root')!);

export default Modal;
