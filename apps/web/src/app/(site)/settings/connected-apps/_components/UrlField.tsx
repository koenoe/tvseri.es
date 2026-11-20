'use client';

import { useCallback, useRef, useState } from 'react';

import { LATE_FADE } from '@/components/motion/lateFade';
import Button from '@/components/ui/button/Button';
import {
  checkGlyph,
  copyGlyph,
  eyeGlyph,
  eyeOffGlyph,
} from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';

import { SM_BUTTON } from '../../_lib/appButtons';
import { TOKEN_MASK } from '../_lib/webhookUrl';
import { FIELD_RING_CLASS, URL_FIELD_CLASS } from './layout';

/** How long Copy says Copied before it is Copy again */
const COPIED_MS = 1500;

/**
 * Copy, which says Copied for a moment once the URL is on the clipboard:
 * each word fades in as it takes the label (the toast still says it, for a
 * screen reader too).
 */
function CopyButton({ onCopy }: Readonly<{ onCopy: () => Promise<boolean> }>) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copy = useCallback(async () => {
    if (!(await onCopy())) {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [onCopy]);
  const word = copied ? 'Copied' : 'Copy';
  return (
    <Button
      className={SM_BUTTON}
      icon={copied ? checkGlyph : copyGlyph}
      onClick={copy}
      variant="tonal"
    >
      <span className={LATE_FADE} key={word}>
        {word}
      </span>
    </Button>
  );
}

/**
 * The webhook URL: masked until Show; Copy always copies the whole URL. The
 * token is fetched only when asked for (`usePlexUrl`).
 */
export default function UrlField({
  connected,
  onCopy,
  onToggle,
  pending,
  prefix,
  url,
}: Readonly<{
  /** On the connected (amber) panel */
  connected: boolean;
  onCopy: () => Promise<boolean>;
  onToggle: () => void;
  /** The URL is being fetched */
  pending: boolean;
  prefix: string;
  /** The full URL while shown, else null (dots) */
  url: string | null;
}>) {
  const classes = cn(
    URL_FIELD_CLASS,
    connected
      ? 'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-plex)_25%,transparent)]'
      : FIELD_RING_CLASS,
  );
  const revealed = url !== null;
  const shown = revealed ? url.slice(prefix.length) : TOKEN_MASK;
  const busy = pending ? true : undefined;
  return (
    <div className={classes}>
      <span className="min-w-0 flex-1 truncate">
        {prefix}
        <b className="font-medium text-white">{shown}</b>
      </span>
      <Button
        aria-busy={busy}
        className={SM_BUTTON}
        icon={revealed ? eyeOffGlyph : eyeGlyph}
        onClick={onToggle}
        variant="quiet"
      >
        {revealed ? 'Hide' : 'Show'}
      </Button>
      <CopyButton onCopy={onCopy} />
    </div>
  );
}
