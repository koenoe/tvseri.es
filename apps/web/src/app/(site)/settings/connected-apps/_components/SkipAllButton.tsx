'use client';

import type { UnresolvedGroup } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import { useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';

import SkipAll from '../../_components/problems/SkipAll';
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
        title: `Skipped ${plural(result.data.closed, 'entry', 'entries')}`,
      });
    });
  if (!asking) {
    return (
      <SkipAll groupName={groupName} onClick={askSkip} ref={skipTrigger} />
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
