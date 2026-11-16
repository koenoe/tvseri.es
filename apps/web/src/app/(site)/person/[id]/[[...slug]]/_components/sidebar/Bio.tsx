'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import cn from '@/lib/cn';

/** Below this many characters three lines always hold the text */
const SHORT = 120;

/**
 * TMDB's biography, three lines with More / Less.
 * The server shows More for a long text; once mounted the clamp's real
 * overflow decides.
 */
export default function Bio({ text }: Readonly<{ text: string }>) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(text.length > SHORT);
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element && !open) {
      setClipped(element.scrollHeight > element.clientHeight + 1);
    }
  }, [open]);

  const classes = cn('w-full text-body text-white/80', !open && 'line-clamp-3');
  const label = open ? 'Less' : 'More';
  const toggle = () => setOpen((value) => !value);

  return (
    <section aria-label="Biography" className="flex flex-col items-start gap-2">
      <p className={classes} ref={ref}>
        {text}
      </p>
      {clipped || open ? (
        <button
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1 text-body-sm font-medium text-white"
          onClick={toggle}
          type="button"
        >
          {label}
          <ExpandChevron open={open} size={13} />
        </button>
      ) : null}
    </section>
  );
}
