'use client';

import { usePageStore } from '../Page/PageStoreProvider';
import BackgroundGlobalBase from './BackgroundGlobalBase';

export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);

  return <BackgroundGlobalBase color={color} />;
}
