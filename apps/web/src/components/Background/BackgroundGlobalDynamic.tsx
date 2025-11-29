'use client';

import { useEffect, useRef, useState } from 'react';

import { usePageStore } from '../Page/PageStoreProvider';
import BackgroundGlobalBase from './BackgroundGlobalBase';

export default function BackgroundGlobalDynamic() {
  const color = usePageStore((state) => state.backgroundColor);
  const [enableTransitions, setEnableTransitions] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setEnableTransitions(true);
  }, []);

  return (
    <BackgroundGlobalBase color={color} enableTransitions={enableTransitions} />
  );
}
