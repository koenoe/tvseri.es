'use client';

import type { ScrobbleAccount } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';

import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';
import cn from '@/lib/cn';

import { whoChoiceOf, whoLine } from '../_lib/plexCopy';
import {
  OPTION_LINE_CLASS,
  OPTION_ROW_CLASS,
  OPTION_TEXT_CLASS,
  OPTION_TITLE_CLASS,
  OPTIONS_CLASS,
  PAUSE_LINE,
  SEGMENT_CLASS,
  SEGMENTED_CLASS,
} from './layout';
import Switch from './Switch';

function Row({
  children,
  description,
  title,
}: Readonly<{ children: ReactNode; description: string; title: string }>) {
  return (
    <div className={OPTION_ROW_CLASS}>
      <span className={OPTION_TEXT_CLASS}>
        <b className={OPTION_TITLE_CLASS}>{title}</b>
        <span className={OPTION_LINE_CLASS}>{description}</span>
      </span>
      {children}
    </div>
  );
}

/**
 * Pause scrobbling and Whose plays count. "Only
 * <account>" needs an account a scrobble has named (the API refuses any
 * other); until then it is off and says why.
 */
export default function PlexOptions({
  account,
  connected,
  onlyAccountId,
  paused,
  setOnlyAccountId,
  setPaused,
}: Readonly<{
  connected: boolean;
  /** The account "Only …" names: the saved one, else the last scrobble's */
  account: ScrobbleAccount | null;
  onlyAccountId: number | null;
  paused: boolean;
  setOnlyAccountId: (id: number | null) => void;
  setPaused: (paused: boolean) => void;
}>) {
  const choice = whoChoiceOf(onlyAccountId);
  const line = whoLine(choice, account !== null);
  const classes = cn(
    OPTIONS_CLASS,
    connected && 'border-[rgb(229_160_13/0.18)]',
  );
  const togglePause = () => setPaused(!paused);
  const pickMe = () => account && setOnlyAccountId(account.id);
  const pickAll = () => setOnlyAccountId(null);
  const noAccount = account === null;
  const onlyMe = choice === 'me';
  const everyone = choice === 'all';
  return (
    <div className={classes}>
      <Row description={PAUSE_LINE} title="Pause scrobbling">
        <Switch
          aria-label="Pause scrobbling"
          checked={paused}
          onClick={togglePause}
        />
      </Row>
      <Row description={line} title="Whose plays count">
        <Segmented className={SEGMENTED_CLASS} label="Whose plays count">
          <SegmentedItem
            className={SEGMENT_CLASS}
            disabled={noAccount}
            onClick={pickMe}
            pressed={onlyMe}
          >
            {account ? `Only ${account.title}` : 'Only you'}
          </SegmentedItem>
          <SegmentedItem
            className={SEGMENT_CLASS}
            onClick={pickAll}
            pressed={everyone}
          >
            Everyone
          </SegmentedItem>
        </Segmented>
      </Row>
    </div>
  );
}
