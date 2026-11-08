'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { CheckIcon, CopyIcon } from './WebhookIcons';

/** Copies `value`, then shows "Copied" for a second */
export default function CopyButton({
  className,
  value,
}: Readonly<{
  className?: string;
  value: string;
}>) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    } catch (error) {
      toast.error(`Failed to copy URL: ${(error as Error).message}`);
    }
  };

  return (
    <button className={className} onClick={handleCopy} type="button">
      {isCopied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-semibold text-white">Copied</span>
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Copy</span>
        </>
      )}
    </button>
  );
}
