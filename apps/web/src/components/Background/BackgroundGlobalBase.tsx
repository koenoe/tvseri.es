'use client';

import { useInsertionEffect } from 'react';

export default function BackgroundGlobalBase({
  color,
}: Readonly<{
  color: string;
}>) {
  useInsertionEffect(() => {
    document.documentElement.style.setProperty(
      '--main-background-color',
      color,
    );
  }, [color]);

  return (
    <style global jsx>{`
      body,
      main,
      main + div,
      footer {
        background-color: var(--main-background-color) !important;
      }
    `}</style>
  );
}
