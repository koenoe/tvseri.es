'use client';

import { useCallback, useRef } from 'react';

import Button from '@/components/ui/button/Button';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { showToast } from '@/components/ui/toast/showToast';

import { shortCodeRange } from '@/lib/marking/copy';
import Section from './Section';
import { Specimen } from './Specimen';
import ToastPositions from './ToastPositions';

const EYE = <Icon active glyph={eyeGlyph} size={16} />;
const UNDO = { label: 'Undo', onClick: () => showToast({ title: 'Undone' }) };

export default function ToastSection() {
  // The marking core merges Just-now marks of next-door episodes in one
  // season into one toast by id.
  const marks = useRef<{ id?: number | string; last: number }>({ last: 4 });

  const markNext = useCallback(() => {
    marks.current.last += 1;
    const first = 5;
    const { last } = marks.current;
    const range = shortCodeRange(first, last);
    marks.current.id = showToast({
      action: UNDO,
      icon: EYE,
      id: marks.current.id,
      title: `Marked ${range} · Just now`,
    });
  }, []);

  const markSeason = useCallback(() => {
    marks.current = { last: 4 };
    showToast({
      action: UNDO,
      icon: EYE,
      secondaryAction: {
        label: 'Use release dates',
        onClick: () => showToast({ title: 'Dated to release days' }),
      },
      title: 'Marked Season 2 · Just now · incl. 1 skipped',
    });
  }, []);

  const long = useCallback(() => {
    marks.current = { last: 4 };
    showToast({
      action: UNDO,
      icon: EYE,
      title:
        'Marked S03E06 Napkins, S03E07 Legacy and S03E08 Ice Chips · Just now',
    });
  }, []);

  const fail = useCallback(() => {
    marks.current = { last: 4 };
    showToast({
      action: { label: 'Try again', onClick: () => {} },
      title: 'Couldn’t mark S03E05. Check your connection.',
      tone: 'error',
    });
  }, []);

  return (
    <Section id="toasts" source="the dark MarkToast" title="Toast">
      <p className="text-body-sm text-white/60">
        One at a time, bottom right of the viewport, 24px in, as wide as its
        message: 280px at least, 560px at most, where a long message takes a
        second line (full width on a phone). Hover or focus it to keep it; it
        closes 6s after you leave it. On a phone a toast with two actions puts
        them on a second line under the message.
      </p>
      <Specimen label="Fire one" note="Mark toast">
        <Button onClick={markNext}>Mark the next episode (merges)</Button>
        <Button onClick={markSeason}>Mark a season (two actions)</Button>
        <Button onClick={long}>A long message (two lines)</Button>
        <Button onClick={fail}>An error</Button>
      </Specimen>
      <ToastPositions />
    </Section>
  );
}
