'use client';

import BackgroundGlobalBase from './BackgroundGlobalBase';
import { usePageStore } from '../Page/PageStoreProvider';

export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);

  return <BackgroundGlobalBase color={color} />;
}
