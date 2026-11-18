'use client';

import { type ReactNode, useId } from 'react';

import Button from '@/components/ui/button/Button';
import { DialogCloseCircle } from '@/components/ui/dialog/DialogClose';
import type { PanelMotion } from '@/components/ui/dialog/dialogMotion';
import ModalShell from '@/components/ui/dialog/ModalShell';
import {
  downloadGlyph,
  linkGlyph,
  seasonGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import {
  CardPreview,
  CopyLinkButton,
  FormatSwitch,
  PublicNote,
  ThemeSwitch,
} from './ShareControls';
import { displayLink, type ShareCard, sizeLabel } from './shareCard';
import useShareCard, { type ShareState } from './useShareCard';

/** A 12px rise and fade (.22s ease-out) */
const MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    transition: { duration: 0.22, ease: 'easeOut' },
    y: 0,
  },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' }, y: 12 },
  initial: { opacity: 0, y: 12 },
};

/**
 * Pinned 132px from the top wherever
 * the 640px panel fits under that (132 + 640 + 16); centred on shorter
 * viewports, clamped to the viewport.
 */
const PANEL =
  'grid w-[1008px] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] grid-cols-[620px_minmax(0,1fr)] self-center justify-self-center [@media(min-height:788px)]:mt-[132px] [@media(min-height:788px)]:self-start overflow-y-auto overflow-x-hidden rounded-[20px] bg-ground shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.08)]';

/** The stage's preview: the square at 540, the story 304 × 540 */
const PREVIEW = {
  square: { height: 540, width: 540 },
  story: { height: 540, width: 304 },
} as const;

const FORMATS = ['square', 'story'] as const;

/**
 * The desktop share dialog: the card on the
 * left, Format and Theme, Download image and Copy link on the right.
 */
export default function ShareDialog({
  card,
  onOpenChange,
  open,
}: Readonly<{
  card: ShareCard;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>) {
  const titleId = useId();
  const share = useShareCard(card, 'square', false);
  const preview = PREVIEW[share.format];
  return (
    <ModalShell
      backdropClassName="bg-[rgb(6_9_10/0.74)]"
      labelledBy={titleId}
      motion={MOTION}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={PANEL}
    >
      <div className="flex h-[640px] items-center justify-center bg-[#121718]">
        <CardPreview alt={card.description} path={share.path} size={preview} />
      </div>
      <div className="relative flex flex-col gap-6 px-8 pt-9 pb-8">
        <div className="flex flex-col gap-2 pr-12">
          <span className="text-overline text-white/60 uppercase">Share</span>
          <h2 className="text-title-3" id={titleId}>
            {card.username}’s {card.year}, as a card
          </h2>
        </div>
        <div className="absolute top-7 right-7">
          <DialogCloseCircle iconSize={14} />
        </div>
        <FormatGroup share={share} />
        <Group label="Theme">
          <ThemeSwitch share={share} size="dialog" swatch={card.swatch} />
        </Group>
        <span aria-hidden className="h-px bg-white/8" />
        <Actions share={share} />
        <PublicNote className="mt-auto" />
      </div>
    </ModalShell>
  );
}

function Group({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-caption text-white/60">{label}</span>
      {children}
    </div>
  );
}

/** Format, with the size and the file it saves as */
function FormatGroup({ share }: Readonly<{ share: ShareState }>) {
  const size = sizeLabel(share.format);
  return (
    <Group label="Format">
      <FormatSwitch order={FORMATS} share={share} size="dialog" />
      <MetaRow className="flex-wrap gap-y-1.5">
        <MetaItem icon={seasonGlyph}>{size}</MetaItem>
        <MetaItem icon={downloadGlyph}>{share.fileName}</MetaItem>
      </MetaRow>
    </Group>
  );
}

/** Download image, Copy link and the link itself */
function Actions({ share }: Readonly<{ share: ShareState }>) {
  const link = displayLink(window.location.host, share.pagePath);
  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        <Button
          // no edge here: 4px narrower than the shared primary
          className="border-0 has-[>svg:first-child]:pl-4"
          icon={downloadGlyph}
          iconSize={14}
          onClick={share.save}
          variant="primary"
        >
          Download image
        </Button>
        <CopyLinkButton share={share} />
      </div>
      <div className="flex h-10 items-center gap-2.5 whitespace-nowrap rounded-10 bg-black/25 px-3.5 text-body-sm text-white/80">
        <Icon className="shrink-0" glyph={linkGlyph} size={14} />
        <span className="truncate">{link}</span>
      </div>
    </>
  );
}
