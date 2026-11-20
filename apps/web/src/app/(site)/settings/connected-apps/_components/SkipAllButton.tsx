'use client';

import type { UnresolvedGroup } from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';
import { useTransition } from 'react';

import Button from '@/components/ui/button/Button';
import { showToast } from '@/components/ui/toast/showToast';

import { SMALL_BUTTON } from '../../_components/problems/styles';
import { appErrorText } from '../_lib/appState';
import { skipAllEntries } from '../reviewActions';
import ConfirmRow from './ConfirmRow';
import { useConnectedService } from './ServiceContext';
import useConfirm from './useConfirm';

/**
 * Skip all for one review group, loaded or not. Skip can't be undone, so the
 * first press asks in a confirm row. `onSkipped` places focus before the
 * row (and maybe the group) leaves.
 */
export default function SkipAllButton({
  group,
  groupName,
  onSkipped,
}: Readonly<{
  group: UnresolvedGroup;
  groupName: string;
  onSkipped: (closed: number) => void;
}>) {
  const { id, name } = useConnectedService();
  const { ask, asking, cancel, close, trigger } = useConfirm<'skip'>();
  const [pending, startTransition] = useTransition();
  const askSkip = () => ask('skip');
  const skipTrigger = trigger('skip');
  const skipAll = () =>
    startTransition(async () => {
      const result = await skipAllEntries(id, group);
      if (!result.ok) {
        showToast({ title: appErrorText(name)[result.error], tone: 'error' });
        return;
      }
      onSkipped(result.data.closed);
      close();
      showToast({
        title: `Skipped ${formatGrouped(result.data.closed)} ${result.data.closed === 1 ? 'entry' : 'entries'}`,
      });
    });
  if (!asking) {
    return (
      <Button
        aria-label={`Skip all in ${groupName}`}
        className={SMALL_BUTTON}
        onClick={askSkip}
        ref={skipTrigger}
        size="xs"
        variant="tonal"
      >
        <span className="text-body-sm">Skip all</span>
      </Button>
    );
  }
  // The confirm row Disconnect uses, on its own line under the header. It
  // rises in but leaves at once: fading out, it would hold the header's
  // container full width, so the returning button would drop a line and
  // jump back up after the fade.
  return (
    <div data-asking="">
      <ConfirmRow
        confirm="Skip all"
        onCancel={cancel}
        onConfirm={skipAll}
        pending={pending}
      >
        Skip every entry in {groupName}, the ones not shown yet too? They won’t
        come back.
      </ConfirmRow>
    </div>
  );
}
