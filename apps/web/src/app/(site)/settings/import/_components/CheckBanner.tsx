import Button from '@/components/ui/button/Button';
import { checkGlyph, columnsGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { SMALL_BUTTON } from './styles';

/**
 * The Check step's banner: the file, what we
 * recognised and filled in, and the "Edit columns" disclosure.
 */
export default function CheckBanner({
  edit,
  line,
  name,
  onToggle,
}: Readonly<{
  edit: boolean;
  line: string;
  name: string;
  onToggle: () => void;
}>) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 rounded-16 bg-white/5 px-6 py-4 text-white/80 md:grid-cols-[22px_minmax(0,1fr)_auto] md:items-center">
      <span className="flex size-5.5 items-center justify-center rounded-full bg-white/16 text-white max-md:mt-0.5">
        <Icon glyph={checkGlyph} size={13} />
      </span>
      <span className="flex min-w-0 flex-col gap-2">
        <b className="truncate text-body-sm font-semibold" title={name}>
          {name}
        </b>
        <span className="text-meta leading-5">{line}</span>
      </span>
      <Button
        aria-expanded={edit}
        className={`${SMALL_BUTTON} justify-self-start max-md:col-start-2`}
        icon={columnsGlyph}
        iconSize={13}
        onClick={onToggle}
        size="xs"
        variant="tonal"
      >
        <span className="text-body-sm font-medium">
          {edit ? 'Hide columns' : 'Edit columns'}
        </span>
      </Button>
    </div>
  );
}
