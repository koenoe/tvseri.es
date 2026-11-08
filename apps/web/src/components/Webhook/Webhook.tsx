'use client';

import type { ScrobbleProvider } from '@tvseri.es/constants';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { getActionErrorMessage } from '@/app/actionResult';
import { generateWebhookToken } from '@/app/actions';
import LoadingDots from '@/components/LoadingDots/LoadingDots';

import CopyButton from './CopyButton';
import { EyeIcon, EyeOffIcon, PlusIcon, RegenerateIcon } from './WebhookIcons';

const MASK = '*'.repeat(16);

const buttonStyles =
  'inline-flex h-8 shrink-0 items-center justify-center gap-x-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white disabled:pointer-events-none';
const iconButtonStyles = twMerge(buttonStyles, 'w-8');
const textButtonStyles = twMerge(buttonStyles, 'px-3');

/**
 * A provider's webhook URL. Nothing is generated until the user asks; the
 * token is masked until shown. Regenerating replaces the token right away
 * (the old URL stops working), so there's no confirmation step.
 */
export default function Webhook({
  className,
  initialToken,
  placeholder,
  type,
  urlPrefix,
}: Readonly<{
  className?: string;
  initialToken: string | null;
  placeholder: string;
  type: ScrobbleProvider;
  urlPrefix: string;
}>) {
  const [token, setToken] = useState(initialToken);
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateWebhookToken(type);
      if (result.ok) {
        setToken(result.token);
      } else {
        toast.error(getActionErrorMessage(result.error));
      }
    });
  };
  const handleToggleVisible = () => setIsVisible((value) => !value);

  const url = token ? `${urlPrefix}${token}` : null;
  const displayedUrl = token ? `${urlPrefix}${isVisible ? token : MASK}` : null;
  const urlStyles = twMerge('min-w-0 flex-1 truncate', url && 'text-white/80');
  const generateLabel = isPending ? 'Generating' : undefined;
  const generateStyles = twMerge(textButtonStyles, 'min-w-[6.5rem]');
  const visibilityLabel = isVisible ? 'Hide token' : 'Show token';

  return (
    <div
      className={twMerge(
        'relative flex h-28 w-full items-center rounded-xl px-8 shadow-lg',
        className,
      )}
    >
      <div className="flex w-full items-center gap-x-2 rounded-lg bg-black/20 py-2 pl-4 pr-2 text-sm text-white/60">
        <span className={urlStyles}>{displayedUrl ?? placeholder}</span>
        {url ? (
          <>
            <button
              aria-label={visibilityLabel}
              className={iconButtonStyles}
              onClick={handleToggleVisible}
              type="button"
            >
              {isVisible ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
            <button
              aria-label="Regenerate URL"
              className={iconButtonStyles}
              disabled={isPending}
              onClick={handleGenerate}
              type="button"
            >
              {isPending ? (
                <LoadingDots className="h-1.5 w-5" />
              ) : (
                <RegenerateIcon className="h-4 w-4" />
              )}
            </button>
            <CopyButton className={textButtonStyles} value={url} />
          </>
        ) : (
          <button
            aria-label={generateLabel}
            className={generateStyles}
            disabled={isPending}
            onClick={handleGenerate}
            type="button"
          >
            {isPending ? (
              <LoadingDots className="h-2 w-7" />
            ) : (
              <>
                <PlusIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">Generate</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
