'use client';

import {
  type ConnectionService,
  type ConnectionStatus,
  type LinkCode,
  LinkCodeSchema,
} from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';
import {
  cancelLinkCode,
  linkFailureText,
  readRequestState,
  readRuntime,
  sendLinkCode,
} from '@/lib/extension/extension';
import { connectedService } from '../../_lib/services';
import { codeLifeLeft } from '../_lib/codeLife';
import { type ServiceCardStatus, toCardStatus } from '../_lib/serviceCard';
import { appToggleId } from './AppsAccordion';
import { readAs, readStatus } from './readStatus';

/** How often the card asks whether the extension has landed the link. */
const POLL_MS = 3000;
const TICK_MS = 1000;
const LINK_CODE_URL = '/api/connections/link-code';

/** A code for this service only: it links nothing else */
const mintCode = (service: ConnectionService) =>
  readAs(
    fetch(LINK_CODE_URL, {
      body: JSON.stringify({ service }),
      method: 'POST',
    }),
    LinkCodeSchema,
  );

/** Where focus goes when the pairing's own controls leave */
const focusToggle = (service: ConnectionService) =>
  document.getElementById(appToggleId(service))?.focus();

/** Best effort: the code expires on its own within minutes anyway. */
const revokeCode = () => {
  fetch(LINK_CODE_URL, { method: 'DELETE' }).catch(() => undefined);
};

/**
 * A link that works: a signed-out link is still `connected`, so only a
 * session the service accepts ends the pairing.
 */
const isLanded = (
  status: ConnectionStatus | null,
): status is ConnectionStatus =>
  status?.connected === true && status.status === 'ok';

const countdownOf = (remaining: number): string => {
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** A code's time left: in words, and as the share of its life (the bar) */
export type Countdown = Readonly<{ left: number; text: string }>;

/**
 * The card's pairing: Connect mints a code and hands it to the extension,
 * which asks the viewer to confirm in its popup. The poll is the source of
 * truth; the extension's answer only adds why it failed (`notice`).
 * `linked` bridges until the server's status shows the link (`landed`),
 * then is let go, so a later sign-out the server reports is drawn as one.
 */
export default function usePairing(
  service: ConnectionService,
  extensionId: string | null,
  landed: boolean,
) {
  const router = useRouter();
  const [code, setCode] = useState<LinkCode | null>(null);
  const [linked, setLinked] = useState<ServiceCardStatus | null>(null);
  // Adjusted while rendering, not in an effect: no frame draws the stale link
  if (landed && linked !== null) {
    setLinked(null);
  }
  const [notice, setNotice] = useState<string | null>(null);
  // The extension has the code and waits for the viewer in its popup
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // When the code on screen was minted: its life runs from here
  const [mintedAt, setMintedAt] = useState(0);
  const [minting, startMinting] = useTransition();
  // The code the extension's answer belongs to: a stale answer is dropped
  const handedOver = useRef<string | null>(null);
  // The poll and the extension's answer can both be reading when the link
  // lands: only the first to see it lands it (one toast, refresh, focus)
  const landing = useRef(false);

  const expired = code !== null && now >= code.expiresAt;
  const live = code !== null && !expired;

  /** While the extension holds the code: did the viewer cancel in its popup? */
  const checkDeclined = useCallback(async () => {
    const runtime = readRuntime();
    const held = handedOver.current;
    if (!extensionId || !runtime || !held) {
      return;
    }
    const state = await readRequestState(runtime, extensionId, held);
    if (state === 'declined' && handedOver.current === held) {
      handedOver.current = null;
      setConfirming(false);
      setNotice('Cancelled in the extension. Press Connect to try again.');
    }
  }, [extensionId]);

  const checkLink = useCallback(async () => {
    const found = await readStatus(service);
    if (isLanded(found) && !landing.current) {
      landing.current = true;
      // The poll lands it: focus moves only if the pairing held it (its
      // controls leave now) or it was already lost
      const active = document.activeElement;
      const lost =
        !active ||
        active === document.body ||
        active.closest('[data-pairing]') !== null;
      setLinked(toCardStatus(found));
      setCode(null);
      setNotice(null);
      setConfirming(false);
      handedOver.current = null;
      router.refresh();
      if (lost) {
        focusToggle(service);
      }
      showToast({ title: `${connectedService(service).name} connected` });
    }
  }, [router, service]);

  // Timers are a subscription to the clock and the API: an effect is the way
  useEffect(() => {
    if (!live) {
      return;
    }
    const tick = setInterval(() => {
      if (!document.hidden) {
        setNow(Date.now());
      }
    }, TICK_MS);
    const poll = setInterval(() => {
      if (!document.hidden) {
        checkLink();
        if (confirming) {
          checkDeclined();
        }
      }
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [checkDeclined, checkLink, confirming, live]);

  const handOver = async (minted: string) => {
    const runtime = readRuntime();
    if (!extensionId || !runtime) {
      return;
    }
    handedOver.current = minted;
    const reply = await sendLinkCode(runtime, extensionId, minted, service);
    if (handedOver.current !== minted || !reply) {
      return;
    }
    if (reply.ok) {
      // Don't wait for the next poll
      checkLink();
      return;
    }
    if (reply.reason === 'pending-consent') {
      setConfirming(true);
      return;
    }
    setNotice(linkFailureText(connectedService(service))[reply.reason]);
  };

  const connect = () =>
    startMinting(async () => {
      landing.current = false;
      const minted = await mintCode(service);
      if (!minted) {
        showToast({ title: 'Couldn’t get a code. Try again.', tone: 'error' });
        return;
      }
      const at = Date.now();
      setNow(at);
      setMintedAt(at);
      setNotice(null);
      setConfirming(false);
      setCode(minted);
      // Not awaited: the extension may take seconds, and the code is on
      // screen meanwhile
      handOver(minted.code);
    });

  const cancel = () => {
    // The extension drops what it holds, so its popup doesn't ask later
    const held = handedOver.current;
    const runtime = readRuntime();
    if (held && extensionId && runtime) {
      cancelLinkCode(runtime, extensionId, held);
    }
    handedOver.current = null;
    setCode(null);
    setNotice(null);
    setConfirming(false);
    revokeCode();
    // Cancel leaves with the code: the card's toggle holds focus
    focusToggle(service);
  };

  /** After Disconnect: the link the poll saw is gone. */
  const forget = () => setLinked(null);

  const countdown: Countdown = code
    ? {
        left: codeLifeLeft(now, mintedAt, code.expiresAt),
        text: countdownOf(Math.max(0, code.expiresAt - now)),
      }
    : { left: 0, text: '' };
  return {
    cancel,
    code: code?.code ?? null,
    // An expired code has nothing left to confirm: the card offers a new one
    confirming: confirming && !expired,
    connect,
    countdown,
    expired,
    forget,
    linked,
    minting,
    notice,
  };
}
