'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { extensionGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { BrowserSupport } from '@/lib/extension/browserSupport';
import { extensionInstall } from '@/lib/extension/extension';
import { useExtensionPing } from '@/lib/extension/useExtension';

import LineSkeleton from '../../_components/LineSkeleton';

// One line of a fixed height in every state, so the cards below never move
// as it fills in
const LINE =
  'flex h-5 min-w-0 items-center gap-2 whitespace-nowrap text-meta text-white/60';
const LINK =
  'font-medium text-white/80 underline decoration-white/30 underline-offset-3 transition-colors hover:text-white';

const INSTALL = extensionInstall();

/**
 * Each answer fades in over the bar or the answer before it (200ms); the
 * bar itself doesn't, as the placeholder already drew it
 */
const ANSWER = 'transition-opacity duration-200 ease-out starting:opacity-0';

/**
 * The extension's own state, once, above the cards: its version, the way to
 * add it, or why it can't run here. Asked again when the tab shows, so an
 * install in another tab is seen.
 */
export default function ExtensionStatusLine({
  browser,
}: Readonly<{ browser: BrowserSupport }>) {
  const ping = useExtensionPing(true, browser);
  let state: ReactNode;
  let answer = 'missing';
  if (ping.state === 'checking') {
    state = <LineSkeleton className="w-40" />;
    answer = 'checking';
  } else if (ping.state === 'unsupported') {
    state = 'Needs Chrome on a computer';
    answer = 'unsupported';
  } else if (ping.found) {
    state = `Installed · ${ping.found.version}`;
    answer = 'installed';
  } else {
    state = (
      <>
        Not installed ·{' '}
        <Link
          className={LINK}
          href={INSTALL.href}
          {...(INSTALL.external && {
            rel: 'noopener noreferrer',
            target: '_blank',
          })}
        >
          Add to Chrome
        </Link>
      </>
    );
  }
  const answerClass = answer === 'checking' ? undefined : ANSWER;
  return (
    <p className={LINE} role="status">
      <Icon glyph={extensionGlyph} size={14} />
      <span className="min-w-0 truncate">
        <Link className={LINK} href="/extension">
          Chrome extension
        </Link>{' '}
        ·{' '}
        <span className={answerClass} key={answer}>
          {state}
        </span>
      </span>
    </p>
  );
}
