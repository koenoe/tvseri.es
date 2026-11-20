'use client';

import { type ReactNode, useId } from 'react';

import AddToChrome from '@/components/extension/AddToChrome';
import Button from '@/components/ui/button/Button';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { ButtonFace } from '@/components/ui/ghost/ghosts';
import { plugGlyph, updateGlyph } from '@/components/ui/icon/glyphs';
import type { ExtensionCheck } from '@/lib/extension/extension';

import FlashTarget from './motion/NeedsYouFlash';
import { useConnectedService } from './ServiceContext';

const PRIMARY = 'px-6 font-semibold';
const ROW = 'flex flex-wrap items-center gap-2';

/**
 * Connect, once the extension is installed. Without it (or with one too old
 * for this service), Add to Chrome leads and Connect waits, disabled, with
 * the reason. While the browser is checked, only Connect's box, so nothing
 * jumps. `children` close the row. On a card that opened because the
 * service signed it out, the primary action gets its one flash.
 */
export default function ServiceConnectActions({
  children,
  extension,
  label,
  onConnect,
  pending,
}: Readonly<{
  children?: ReactNode;
  extension: ExtensionCheck;
  /** "Connect Netflix" (the service by name), "Connect again" */
  label: string;
  onConnect: () => void;
  pending: boolean;
}>) {
  const { copy, name } = useConnectedService();
  const reasonId = useId();
  if (extension === 'unsupported') {
    return <p className="text-meta text-white/80">{copy.unavailable}</p>;
  }
  if (extension === 'checking') {
    return (
      <div className={ROW}>
        <span aria-hidden="true" className="contents">
          <ButtonFace
            className={PRIMARY}
            icon={plugGlyph}
            size="md"
            variant="primary"
          >
            {label}
          </ButtonFace>
        </span>
        {children}
      </div>
    );
  }
  if (extension === 'present') {
    return (
      <div className={ROW}>
        <FlashTarget>
          <Button
            className={PRIMARY}
            icon={plugGlyph}
            onClick={onConnect}
            pending={pending}
            variant="primary"
          >
            {label}
          </Button>
        </FlashTarget>
        {children}
      </div>
    );
  }
  const reason =
    extension === 'outdated'
      ? `This version of the extension can’t connect ${name} yet. Update it first.`
      : 'Add the extension to Chrome first, then connect here.';
  return (
    <div className="flex flex-col gap-3">
      <div className={ROW}>
        <FlashTarget>
          {extension === 'outdated' ? (
            <ButtonLink
              className={PRIMARY}
              href="/extension"
              icon={updateGlyph}
              variant="primary"
            >
              Update the extension
            </ButtonLink>
          ) : (
            <AddToChrome className={PRIMARY} />
          )}
        </FlashTarget>
        <Button
          aria-describedby={reasonId}
          disabled
          icon={plugGlyph}
          variant="tonal"
        >
          {label}
        </Button>
        {children}
      </div>
      <p className="text-meta text-white/60" id={reasonId}>
        {reason}
      </p>
    </div>
  );
}
