'use client';

import { useState } from 'react';

import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export default function Webhook({
  className,
  url,
}: Readonly<{
  className?: string;
  url?: string;
}>) {
  const [showCopied, setShowCopied] = useState(false);
  const handleCopy = async () => {
    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1000);
    } catch (err) {
      const error = err as Error;
      toast.error(`Failed to copy URL: ${error.message}`);
    }
  };

  return (
    <div
      className={twMerge(
        'relative flex h-28 w-full items-center rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 px-8 shadow-lg',
        className,
      )}
    >
      {url ? (
        <div className="flex w-full items-center gap-x-4 truncate rounded-lg bg-black/20 px-4 py-2 text-sm text-white/60 outline-none">
          <span className="truncate">{url}</span>
          <button
            className="ml-auto inline-flex shrink-0 items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-white/60 hover:text-white"
            onClick={handleCopy}
          >
            {showCopied ? (
              <span className="inline-flex items-center">
                <svg
                  aria-hidden="true"
                  className="me-1.5 h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 16 12"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 5.917 5.724 10.5 15 1.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-xs font-semibold text-white">Copied</span>
              </span>
            ) : (
              <span className="inline-flex items-center">
                <svg
                  className="me-1.5 h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 18 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z" />
                </svg>
                <span className="text-xs font-semibold">Copy</span>
              </span>
            )}
          </button>
        </div>
      ) : (
        <span className="italic text-white/60">Coming soon</span>
      )}
    </div>
  );
}
