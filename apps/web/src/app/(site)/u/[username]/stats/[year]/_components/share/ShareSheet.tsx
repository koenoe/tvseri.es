'use client';

import { useId } from 'react';

import Button from '@/components/ui/button/Button';
import { DialogCloseCircle } from '@/components/ui/dialog/DialogClose';
import type { PanelMotion } from '@/components/ui/dialog/dialogMotion';
import ModalShell from '@/components/ui/dialog/ModalShell';
import SheetHandle from '@/components/ui/dialog/SheetHandle';
import { downloadGlyph, shareGlyph } from '@/components/ui/icon/glyphs';
import {
  CardPreview,
  CopyLinkButton,
  FormatSwitch,
  PublicNote,
  ThemeSwitch,
} from './ShareControls';
import type { ShareCard } from './shareCard';
import useShareCard, { prefetchShareCard } from './useShareCard';

/** Up 24px and in (.26s ease-out) */
const MOTION: PanelMotion = {
  animate: {
    opacity: 1,
    transition: { duration: 0.26, ease: 'easeOut' },
    y: 0,
  },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' }, y: 24 },
  initial: { opacity: 0, y: 24 },
};

const PANEL =
  'flex max-h-[calc(100dvh-24px)] w-full flex-col gap-4 self-end overflow-y-auto overscroll-contain rounded-t-[24px] bg-ground px-gutter pt-2.5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_-20px_50px_-10px_rgb(0_0_0/0.7),inset_0_1px_0_rgb(255_255_255/0.08)]';

/** The stage's preview: the story 225 × 400, the square 326 */
const PREVIEW = {
  square: { height: 326, width: 326 },
  story: { height: 400, width: 225 },
} as const;

const FORMATS = ['story', 'square'] as const;

/** The sheet opens on the dark story: `ShareTrigger` fetches it on the tap */
export const prefetchStory = (card: ShareCard) =>
  prefetchShareCard(card, 'story', 'dark');

/**
 * The phone share sheet: Story first (where phone
 * shares go), Story / Square and Dark / Colour, then Share… (the system
 * sheet with the image), Save image and Copy link.
 */
export default function ShareSheet({
  card,
  onOpenChange,
  open,
}: Readonly<{
  card: ShareCard;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>) {
  const titleId = useId();
  const share = useShareCard(card, 'story', true);
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
      <SheetHandle className="self-center" />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-3" id={titleId}>
          {card.username}’s {card.year}, as a card
        </h2>
        <DialogCloseCircle iconSize={14} />
      </div>
      <div className="flex h-[420px] shrink-0 items-center justify-center rounded-16 bg-[#121718]">
        <CardPreview alt={card.description} path={share.path} size={preview} />
      </div>
      <div className="flex justify-between gap-2">
        <FormatSwitch order={FORMATS} share={share} size="sheet" />
        <ThemeSwitch share={share} size="sheet" swatch={card.swatch} />
      </div>
      <Button
        className="h-12 w-full has-[>svg:first-child]:pl-4"
        icon={shareGlyph}
        iconSize={15}
        onClick={share.share}
        variant="primary"
      >
        Share…
      </Button>
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          className="w-full has-[>svg:first-child]:pl-4"
          icon={downloadGlyph}
          iconSize={14}
          onClick={share.save}
          variant="outline"
        >
          Save image
        </Button>
        <CopyLinkButton className="w-full" share={share} />
      </div>
      <PublicNote className="justify-center" />
    </ModalShell>
  );
}
