'use client';

import {
  memo,
  type TransitionEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';

import cn from '@/lib/cn';
import { useIsSignedIn, useSeriesAnswer } from '@/lib/marking/hooks';
import promptSignIn from '@/lib/marking/promptSignIn';
import type { SeriesBase } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';
import { openUpTo } from '../../_lib/dialogs';
import { preloadUpTo } from '../picker/UpToHost';
import PromptCard, {
  PROMPT_CELL,
  PROMPT_FRAME,
  type PromptAnswers,
} from './PromptCard';
import { rememberPromptAnswer } from './promptHint';
import { promptDecision } from './shouldAsk';

type Props = Readonly<{ seriesId: number; title: string }>;

const FRAME = cn('group/prompt', PROMPT_FRAME);

/**
 * "Seen The Bear before?" under the progress line,
 * real content in the static shell for everyone: no blank
 * reserve, no skeleton. The pre-paint hint hides it for a viewer who tracks
 * the show or answered it on this browser, and for a visitor who dismissed
 * it here. Signed in, any answer or mark hides it for good; signed out an
 * answer asks to sign in (as Watchlist does) and Not now dismisses it on
 * this browser for this series. Leaving, it fades and collapses (~220ms) and
 * is removed. Not rendered before the premiere (the hero decides).
 */
function FirstTrackingPrompt({ seriesId, title }: Props) {
  const signedIn = useIsSignedIn();
  // the decision only (a string), so a mark re-renders the prompt when it flips
  const decide = useCallback(
    (view: SeriesBase | undefined) => promptDecision(view, signedIn),
    [signedIn],
  );
  const decision = useSeriesAnswer(seriesId, decide);
  const marking = useMarking();
  const [dismissed, setDismissed] = useState(false);
  const [gone, setGone] = useState(false);
  const leaving = dismissed || decision === 'hide';

  const answers = useMemo<PromptAnswers>(() => {
    const answer = (value: 'starting' | 'not-now' | 'finished') => () => {
      if (!signedIn) {
        promptSignIn();
        return;
      }
      rememberPromptAnswer(seriesId);
      marking.answerFirstTracking(seriesId, value);
    };
    return {
      onFinished: answer('finished'),
      onNotNow: signedIn
        ? answer('not-now')
        : () => {
            rememberPromptAnswer(seriesId);
            setDismissed(true);
          },
      onStarting: answer('starting'),
      onUpTo: () => {
        if (!signedIn) {
          promptSignIn();
          return;
        }
        openUpTo({
          at: 'hero',
          defaultWhen: 'unknown',
          seriesId,
          target: null,
        });
      },
      // a visitor's press asks to sign in: no dialog to fetch
      onUpToIntent: signedIn ? preloadUpTo : undefined,
    };
  }, [marking, seriesId, signedIn]);

  // Removed once its row has collapsed (a hidden frame never transitions,
  // and stays hidden).
  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (
        leaving &&
        event.target === event.currentTarget &&
        event.propertyName === 'grid-template-rows'
      ) {
        setGone(true);
      }
    },
    [leaving],
  );

  if (gone) {
    return null;
  }
  return (
    <div
      className={FRAME}
      data-ask={decision === 'ask' ? '' : undefined}
      data-leaving={leaving ? '' : undefined}
      data-prompt=""
      inert={leaving}
      onTransitionEnd={onTransitionEnd}
    >
      <div className={PROMPT_CELL}>
        <PromptCard answers={answers} seriesTitle={title} />
      </div>
    </div>
  );
}

FirstTrackingPrompt.displayName = 'FirstTrackingPrompt';

export default memo(FirstTrackingPrompt);
