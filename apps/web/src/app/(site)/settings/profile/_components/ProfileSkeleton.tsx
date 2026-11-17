import {
  ButtonFace,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { GHOST_PANEL } from '../../_components/ghostPanel';
import { PREVIEW_FOOT, PreviewLabel } from './ProfilePreview';
import { EDITOR_GRID, FORM_CARD, PREVIEW_CELL } from './profileLayout';

/** The form's fields: label (static), the input's box, the hint line */
const FIELDS = ['Name', 'Username', 'Email'] as const;

const FORM = cn(FORM_CARD, GHOST_PANEL);
const PREVIEW = cn(
  'flex flex-col gap-10 rounded-16 bg-white/4 px-6 py-8',
  GHOST_PANEL,
);
const INPUT = cn('block h-12 rounded-10', GHOST_FILL);
const LINES = [0, 1, 2];

/**
 * The Profile hole while it streams, in the editor's own grid: the form card
 * with its three fields (real labels, the inputs as flat boxes, the hints as
 * bars) and the Save button as a flat pill; the preview card with the
 * handle, three facts and Watches on as ghosts, and its caption line (the
 * static label as text, the link as a bar).
 */
export default function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className={cn(EDITOR_GRID, PULSE)}>
      <div className={PREVIEW_CELL}>
        <div className={PREVIEW}>
          <span className="flex w-75 max-w-full flex-col gap-[22px]">
            {/* the handle's line at its largest size (48px on a 0.95 line; it shrinks with a long handle) */}
            <span className="flex h-[46px] items-center">
              <Ghost className="h-9 w-48 rounded-8" />
            </span>
            <span className="flex flex-col gap-3">
              {LINES.map((n) => (
                <Ghost className="h-[17px] w-44 rounded-4" key={n} />
              ))}
            </span>
            <span className="flex h-[22px] items-center justify-between gap-3">
              <Ghost className="h-[13px] w-20 rounded-4" />
              <Ghost className="h-[22px] w-24 rounded-4" />
            </span>
          </span>
        </div>
        <span className={PREVIEW_FOOT}>
          <PreviewLabel />
          <TextLine className="text-meta" width="w-28" />
        </span>
      </div>
      <div className={FORM}>
        <div className="flex flex-col gap-6">
          {FIELDS.map((label) => (
            <div className="flex flex-col gap-2" key={label}>
              <span className="text-body-sm font-semibold text-white">
                {label}
              </span>
              <span className={INPUT} />
              <TextLine className="text-caption" width="w-60" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/6 pt-6">
          <ButtonFace className="border-0 px-6" size="md" variant="primary">
            Saved
          </ButtonFace>
        </div>
      </div>
    </div>
  );
}
