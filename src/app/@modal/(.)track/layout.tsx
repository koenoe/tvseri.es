import { type ReactNode } from 'react';

import Modal from '@/components/Modal';

export default async function TrackLayoutInModal({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <Modal>{children}</Modal>;
}
