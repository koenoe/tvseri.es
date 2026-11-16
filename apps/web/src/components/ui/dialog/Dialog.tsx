'use client';

import { type ReactNode, useId } from 'react';

import cn from '@/lib/cn';

import { DialogClose, DialogCloseCircle } from './DialogClose';
import { CENTER_MOTION } from './dialogMotion';
import { BACKDROP, SHADOW, SURFACE } from './dialogStyles';
import ModalShell from './ModalShell';
import SheetHandle from './SheetHandle';

export { DialogClose };

/** Phones: the grab handle, in the sheet's 22px top padding (no height added) */
const HANDLE = 'absolute top-2 left-1/2 -translate-x-1/2 sm:hidden';

const PANEL = cn(
  'flex max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] flex-col gap-5 self-center justify-self-center overflow-y-auto overscroll-contain rounded-18 p-6',
  SHADOW.dialog,
  // phones: a bottom sheet (18 18 0 0, 22 20 28)
  'max-sm:max-h-[calc(100dvh-48px)] max-sm:w-full max-sm:max-w-none max-sm:gap-4.5 max-sm:self-end max-sm:rounded-b-none max-sm:px-gutter max-sm:pt-5.5 max-sm:pb-7',
);

/**
 * The centred dialog (the date picker, “I’m up to…”):
 * 560px, title-3 title, meta subline and a ✕; a bottom sheet on phones,
 * topped by the grab handle (it swipes down to close).
 * Controlled: render it where the trigger lives and flip `open`. A URL-driven
 * dialog passes `open` from `useSearchParams()` in a small island.
 *
 * @example
 * <Dialog open={open} onOpenChange={setOpen} title="When did you watch it?">
 *   …
 *   <DialogFooter><DialogClose>Cancel</DialogClose></DialogFooter>
 * </Dialog>
 */
/**
 * `tinted` (default): the show page's dialog, 560px, its
 * surface mixed from the page colour, title-3. `plain`: Settings' dialogs
 * (Undo import, Delete account), 520px on the plain ground
 * #1b2122, a 16/28 title. Both are bottom sheets on phones.
 */
export type DialogVariant = 'plain' | 'tinted';

const VARIANT_PANEL: Readonly<Record<DialogVariant, string>> = {
  plain: 'w-130 bg-[#1b2122]',
  tinted: cn('w-140', SURFACE.dialog),
};

/** Title to description: 4px under the show page's title-3, 8px in Settings (.dlg-ht). */
const VARIANT_HEADING: Readonly<Record<DialogVariant, string>> = {
  plain: 'gap-2',
  tinted: 'gap-1',
};

const VARIANT_TITLE: Readonly<Record<DialogVariant, string>> = {
  plain: 'text-body font-semibold',
  tinted: 'text-title-3',
};

export function Dialog({
  children,
  className,
  description,
  onOpenChange,
  open,
  title,
  variant = 'tinted',
}: Readonly<{
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** Required: names the dialog (aria-labelledby). */
  title: ReactNode;
  variant?: DialogVariant;
}>) {
  const titleId = useId();
  const descriptionId = useId();
  const panel = cn(PANEL, VARIANT_PANEL[variant], className);
  const titleClasses = VARIANT_TITLE[variant];
  const headingClasses = cn(
    'flex min-w-0 flex-1 flex-col',
    VARIANT_HEADING[variant],
  );
  return (
    <ModalShell
      backdropClassName={BACKDROP.dialog}
      describedBy={description ? descriptionId : undefined}
      labelledBy={titleId}
      motion={CENTER_MOTION}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={panel}
    >
      <SheetHandle className={HANDLE} />
      <header className="flex items-start gap-4">
        <div className={headingClasses}>
          <h2 className={titleClasses} id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="text-meta text-white/60" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        <DialogCloseCircle />
      </header>
      {children}
    </ModalShell>
  );
}

/**
 * The footer under a hairline: an optional note on the left, buttons on the
 * right.
 */
export function DialogFooter({
  children,
  note,
}: Readonly<{ children: ReactNode; note?: ReactNode }>) {
  return (
    // A div, not <footer>: outside a sectioning element a <footer> is a
    // contentinfo landmark, and a dialog's buttons aren't the page's footer.
    <div className="flex items-center justify-end gap-2.5 border-white/8 border-t pt-3.5">
      {note ? (
        <p className="mr-auto text-caption text-white/60">{note}</p>
      ) : null}
      {children}
    </div>
  );
}
