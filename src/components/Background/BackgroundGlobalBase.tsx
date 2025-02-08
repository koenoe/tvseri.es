'use client';

import { useInsertionEffect } from 'react';

export default function BackgroundGlobalBase({
  color,
}: Readonly<{
  color: string;
}>) {
  useInsertionEffect(() => {
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) {
      meta.setAttribute('content', color);
    }
  }, [color]);

  return (
    <style global jsx>{`
      :root {
        --main-background-color: ${color};
      }

      main,
      main + footer {
        background-color: var(--main-background-color) !important;
      }
    `}</style>
  );
}
