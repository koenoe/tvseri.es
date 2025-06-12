'use client';

import { useInsertionEffect } from 'react';

export default function BackgroundGlobalBase({
  color,
}: Readonly<{
  color: string;
}>) {
  useInsertionEffect(() => {
    // Update theme-color meta tag
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) {
      meta.setAttribute('content', color);
    }

    document.documentElement.style.setProperty(
      '--main-background-color',
      color,
    );
  }, [color]);

  return (
    <style global jsx>{`
      main,
      main + div,
      footer {
        background-color: var(--main-background-color) !important;
      }
    `}</style>
  );
}
