'use client';

import { useInsertionEffect } from 'react';

export default function ScrollbarDetection() {
  useInsertionEffect(() => {
    const scrollable = document.createElement('div');
    scrollable.style.overflow = 'scroll';
    scrollable.style.width = '10px';
    scrollable.style.height = '10px';
    scrollable.style.position = 'absolute';
    scrollable.style.top = '0px';
    scrollable.style.visibility = 'hidden';
    if (document.body) {
      document.body.appendChild(scrollable);
      if (scrollable.scrollWidth !== scrollable.offsetWidth) {
        document.body.classList.add('scrollbar-is-visible');
      }
      document.body.removeChild(scrollable);
    }
  }, []);

  return null;
}
