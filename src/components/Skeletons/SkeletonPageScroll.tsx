'use client';

import { useEffect } from 'react';

export default function SkeletonPageScroll() {
  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.scrollTop = 0;
  }, []);

  return null;
}
