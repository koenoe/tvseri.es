'use client';

import { shortCode } from '@tvseri.es/schemas';
import { useCallback, useState } from 'react';

import Badge from '@/components/ui/button/Badge';
import Button from '@/components/ui/button/Button';
import { chipStyles } from '@/components/ui/button/buttonStyles';
import CircleButton from '@/components/ui/button/CircleButton';
import {
  Dialog,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog/Dialog';
import LargeDialog from '@/components/ui/dialog/LargeDialog';
import SideSheet from '@/components/ui/dialog/SideSheet';
import {
  calendarGlyph,
  clockGlyph,
  eyeGlyph,
  starGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { showToast } from '@/components/ui/toast/showToast';

import Section from './Section';
import { OnStill, Specimen } from './Specimen';

const CHIP_TONAL = chipStyles({ variant: 'tonal' });

type Open = 'dialog' | 'large' | 'sheet' | null;

const EPISODES = Array.from({ length: 10 }, (_, index) => shortCode(index + 1));

export default function DialogSection() {
  const [open, setOpen] = useState<Open>(null);
  const [picker, setPicker] = useState(false);
  const openPicker = useCallback(() => setPicker(true), []);
  const paint = useCallback(() => {
    showToast({
      action: { label: 'Undo', onClick: () => showToast({ title: 'Undone' }) },
      // a mark is "watched": the filled eye, as the design's toast draws it
      icon: <Icon active glyph={eyeGlyph} size={16} />,
      title: 'Marked S03E06–S03E09 · Just now',
    });
  }, []);
  const show = (which: Open) => () => setOpen(which);
  const change = (which: Open) => (next: boolean) =>
    setOpen(next ? which : null);
  const openDialog = show('dialog');
  const openSheet = show('sheet');
  const openLarge = show('large');
  const changeDialog = change('dialog');
  const changeSheet = change('sheet');
  const changeLarge = change('large');
  const dialogOpen = open === 'dialog';
  const sheetOpen = open === 'sheet';
  const largeOpen = open === 'large';

  return (
    <Section
      id="dialogs"
      source="the dialogs: the watch-history sheet and the episode modal"
      title="Dialogs and sheets"
    >
      <p className="text-body-sm text-white/60">
        Escape, the backdrop and ✕ close; focus returns to the button, with its
        ring only when the keyboard opened the dialog. Narrow the window below
        640px for the phone sheets.
      </p>
      <Specimen
        label="Open one"
        note="Dialog (560, radius 18) · side sheet (600, right) · episode shell (1320 × 880)"
      >
        <Button onClick={openDialog}>Centred dialog</Button>
        <Button onClick={openSheet}>Side sheet</Button>
        <Button onClick={openLarge}>Episode modal shell</Button>
      </Specimen>

      <Dialog
        description="Up to S03E05 Children · marks 3 (S03E03–S03E05)"
        onOpenChange={changeDialog}
        open={dialogOpen}
        title="Which episode did you watch last?"
      >
        <div className="flex flex-wrap gap-2">
          <button aria-pressed className={CHIP_TONAL} type="button">
            Just now
          </button>
          <button className={CHIP_TONAL} type="button">
            On release dates
          </button>
          <button className={CHIP_TONAL} type="button">
            I don’t remember <Badge>New</Badge>
          </button>
        </div>
        <DialogFooter note="Undo is in the toast">
          <DialogClose>Cancel</DialogClose>
          <DialogClose variant="primary">
            Mark 3 episodes · just now
          </DialogClose>
        </DialogFooter>
      </Dialog>

      <SideSheet
        description="34 of 47 watched · 3h 46m left"
        onOpenChange={changeSheet}
        open={sheetOpen}
        title="Watch history"
      >
        <div className="flex flex-col gap-3">
          <Button onClick={openPicker} size="sm" variant="tonal">
            Set a date (opens a dialog over the sheet)
          </Button>
          <Button onClick={paint} size="sm" variant="tonal">
            Paint E06–E09 (the toast shows over the sheet)
          </Button>
          {['Season 1', 'Season 2', 'Season 3', 'Season 4'].map((season) => (
            <section className="rounded-16 bg-white/4 px-3.5 py-3" key={season}>
              <h3 className="text-body-sm font-semibold">{season}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {EPISODES.map((episode) => (
                  <button className={CHIP_TONAL} key={episode} type="button">
                    {episode}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <Dialog
          onOpenChange={setPicker}
          open={picker}
          title="When did you watch S03E06–S03E09?"
        >
          <p className="text-body-sm text-white/80">
            A dialog opened from inside the sheet: closing it returns focus to
            the sheet’s button.
          </p>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </Dialog>
      </SideSheet>

      <LargeDialog
        onOpenChange={changeLarge}
        open={largeOpen}
        title="S03E05 Children"
        tools={<CircleButton icon={starGlyph} label="Rate" tone="glass" />}
      >
        <OnStill className="h-full items-end rounded-none p-16 max-sm:p-6">
          <div className="max-w-185">
            <p className="text-overline text-white/60 uppercase">
              Season 3 · Episode 5
            </p>
            <p className="mt-2 font-display text-display">Children</p>
            <MetaRow className="mt-2">
              <MetaItem icon={calendarGlyph}>Jun 26, 2024</MetaItem>
              <MetaItem icon={clockGlyph}>34m</MetaItem>
            </MetaRow>
          </div>
        </OnStill>
      </LargeDialog>
    </Section>
  );
}
