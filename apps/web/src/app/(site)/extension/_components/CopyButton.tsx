'use client';

import type { ReactNode } from 'react';

import Button from '@/components/ui/button/Button';
import { copyGlyph } from '@/components/ui/icon/glyphs';
import { showToast } from '@/components/ui/toast/showToast';

/** Copies `text`, or this page's address without it */
export default function CopyButton({
  children,
  className,
  copied,
  size,
  text,
}: Readonly<{
  children: ReactNode;
  className?: string;
  /** The toast: "Copied chrome://extensions" */
  copied: string;
  size?: 'md' | 'xs';
  text?: string;
}>) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        text ?? `${window.location.origin}${window.location.pathname}`,
      );
      showToast({ title: copied });
    } catch {
      showToast({
        title: 'Couldn’t copy. Select it and copy it.',
        tone: 'error',
      });
    }
  };
  return (
    <Button
      className={className}
      icon={copyGlyph}
      onClick={copy}
      size={size}
      variant="tonal"
    >
      {children}
    </Button>
  );
}
