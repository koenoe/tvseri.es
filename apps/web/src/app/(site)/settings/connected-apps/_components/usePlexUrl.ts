'use client';

import { useRef, useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';

import { PLEX_ERROR_TEXT } from '../_lib/plexCopy';
import { revealPlexUrl } from '../actions';

/**
 * The webhook URL, fetched only when the viewer asks (Show, Copy) and kept in
 * this tab's memory after that; never in the page's HTML or RSC payload.
 * `shown` is the full URL while revealed, else null (the field draws dots).
 */
export default function usePlexUrl() {
  const [url, setUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  // The fetch in flight, so Show and Copy pressed together share one call
  const inFlight = useRef<Promise<string | null> | null>(null);

  const fetchUrl = (): Promise<string | null> => {
    inFlight.current ??= revealPlexUrl()
      .then((result) => {
        if (!result.ok) {
          const title =
            result.error === 'failed'
              ? 'Couldn’t load your Plex URL. Try again.'
              : PLEX_ERROR_TEXT[result.error];
          showToast({ title, tone: 'error' });
          return null;
        }
        setUrl(result.data.url);
        return result.data.url;
      })
      .finally(() => {
        inFlight.current = null;
      });
    return inFlight.current;
  };

  const show = (fresh: boolean) => {
    setRevealed(true);
    if (url && !fresh) {
      return;
    }
    startTransition(async () => {
      const value = await fetchUrl();
      if (!value) {
        setRevealed(false);
      }
    });
  };

  const toggle = () => (revealed ? setRevealed(false) : show(false));

  /** Whether the URL is on the clipboard now (the button then says so) */
  const copy = async (): Promise<boolean> => {
    try {
      const text = url ?? (await fetchUrl());
      if (!text) {
        return false;
      }
      await navigator.clipboard.writeText(text);
      showToast({ title: 'Copied your Plex webhook URL' });
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      showToast({ title: `Failed to copy URL: ${reason}`, tone: 'error' });
      return false;
    }
  };

  /** After New URL: the old one is gone; show the new one. */
  const showFresh = () => {
    setUrl(null);
    show(true);
  };

  /** After Disconnect: nothing to show any more. */
  const forget = () => {
    setUrl(null);
    setRevealed(false);
  };

  const shown = revealed ? url : null;
  return { copy, forget, pending, showFresh, shown, toggle };
}
