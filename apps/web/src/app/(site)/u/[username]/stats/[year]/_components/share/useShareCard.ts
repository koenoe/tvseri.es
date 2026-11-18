'use client';

import { useState } from 'react';
import statsPath from '@/lib/routing/statsPath';
import {
  type CardFormat,
  cardFileName,
  cardPath,
} from '../../_card/cardRequest';
import type { CardTheme } from '../../_card/theme';
import { prefetchCard, readyCard, saveCard, shareCard } from './cardFiles';
import type { ShareCard } from './shareCard';

/**
 * The share UI's state: format and theme, "Link copied" until the format
 * changes, and the actions. The phone sheet
 * also fetches each card it may share (`prefetch`).
 */
/** Starts fetching a variant of the card (the sheet shares the file) */
export const prefetchShareCard = (
  card: ShareCard,
  format: CardFormat,
  theme: CardTheme,
) => prefetchCard(cardPath(card.username, card.year, { format, theme }));

export default function useShareCard(
  card: ShareCard,
  initial: CardFormat,
  prefetch: boolean,
) {
  const [format, setFormat] = useState<CardFormat>(initial);
  const [theme, setTheme] = useState<CardTheme>('dark');
  const [copied, setCopied] = useState(false);
  const { username, year } = card;
  const path = cardPath(username, year, { format, theme });
  const fileName = cardFileName(username, year, format, theme);
  const pagePath = statsPath(username, year);

  const choose = (nextFormat: CardFormat, nextTheme: CardTheme) => {
    if (prefetch) {
      prefetchShareCard(card, nextFormat, nextTheme);
    }
    setFormat(nextFormat);
    setTheme(nextTheme);
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}${pagePath}`)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  return {
    chooseFormat: (next: CardFormat) => {
      setCopied(false);
      choose(next, theme);
    },
    chooseTheme: (next: CardTheme) => choose(format, next),
    copied,
    copyLink,
    fileName,
    format,
    pagePath,
    path,
    save: () => saveCard(path, fileName),
    share: () => {
      const url = `${window.location.origin}${pagePath}`;
      if (!shareCard(readyCard(path), fileName, url)) {
        copyLink();
      }
    },
    theme,
  };
}

export type ShareState = ReturnType<typeof useShareCard>;
