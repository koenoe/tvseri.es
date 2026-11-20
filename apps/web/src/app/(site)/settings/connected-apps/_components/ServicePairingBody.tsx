'use client';

import HowItWorksLink from '@/components/extension/HowItWorksLink';
import SwapIn from '@/components/motion/SwapIn';
import Button from '@/components/ui/button/Button';
import { closeGlyph, historyGlyph } from '@/components/ui/icon/glyphs';
import { focusOnMount } from '@/lib/a11y/focusOnMount';
import { ignoreKeyRepeat } from '@/lib/a11y/ignoreKeyRepeat';
import { MD_BUTTON } from '../../_lib/appButtons';
import ConfirmInExtension from './ConfirmInExtension';
import LinkCodeField from './LinkCodeField';
import { useConnectedService } from './ServiceContext';
import SetupSteps from './SetupSteps';
import type { Countdown } from './usePairing';

/**
 * The code (and why it couldn't link) stands 24px clear of the steps: the
 * body's 16px gap and 8px more; the confirm block keeps the gap alone
 */
const CODE_GROUP = 'flex flex-col gap-4';
const CODE_GROUP_BEFORE_STEPS = `${CODE_GROUP} mb-2`;

/**
 * Pairing: the code above the steps, then Cancel. With the extension
 * installed the code is already on its way: once the extension has it
 * (`confirming`), the card says to confirm in its popup, with the code to
 * compare. An older extension links by itself, and why it couldn't is said
 * under the code.
 */
export default function ServicePairingBody({
  code,
  confirming,
  countdown,
  expired,
  notice,
  onCancel,
  onRenew,
}: Readonly<{
  code: string;
  /** The extension's popup is asking the viewer to confirm */
  confirming: boolean;
  countdown: Countdown;
  expired: boolean;
  /** The extension's reason it couldn't link, in the popup's words */
  notice: string | null;
  onCancel: () => void;
  onRenew: () => void;
}>) {
  const { copy } = useConnectedService();
  // Empty, it is out of the flow (no gap) but stays in the tree, so its
  // first words are announced
  const noticeClass = notice ? 'text-meta text-white/80' : 'sr-only';
  // The confirm block takes the code's place silently: say it once here
  const spoken =
    notice ??
    (confirming ? 'Confirm in the extension, top right of Chrome' : null);
  const group = confirming ? CODE_GROUP : CODE_GROUP_BEFORE_STEPS;
  return (
    <>
      <div className={group} data-pairing="">
        {/* the confirm block rises into the code's place */}
        <SwapIn swapKey={confirming ? 'confirm' : 'code'}>
          {confirming ? (
            <ConfirmInExtension code={code} />
          ) : (
            <LinkCodeField
              code={code}
              countdown={countdown}
              expired={expired}
            />
          )}
        </SwapIn>
        <p aria-live="polite" className={noticeClass}>
          {spoken}
        </p>
      </div>
      {confirming ? null : <SetupSteps lines={copy.steps} />}
      {/* Focus arrives on Cancel from a press (Connect, Get a new code):
          Enter held there mustn't press it too */}
      <div
        className="flex flex-wrap items-center gap-2"
        data-pairing=""
        onKeyDownCapture={ignoreKeyRepeat}
      >
        {expired ? (
          <Button
            className={MD_BUTTON}
            icon={historyGlyph}
            onClick={onRenew}
            variant="tonal"
          >
            Get a new code
          </Button>
        ) : null}
        {/* Keyed by the code: each new code (Connect, Get a new code)
            puts focus here, where the button pressed has gone */}
        <Button
          className={MD_BUTTON}
          icon={closeGlyph}
          key={code}
          onClick={onCancel}
          ref={focusOnMount}
          variant={expired || confirming ? 'quiet' : 'tonal'}
        >
          Cancel
        </Button>
        <HowItWorksLink />
      </div>
    </>
  );
}
