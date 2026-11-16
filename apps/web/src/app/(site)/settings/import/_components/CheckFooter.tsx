import Button from '@/components/ui/button/Button';
import { arrowLeftGlyph, downloadGlyph } from '@/components/ui/icon/glyphs';
import { plural } from '@/lib/format/text';
import { SOLID_BUTTON } from './styles';

/**
 * Another file · (why it can't go on) · Import N episodes. The button stays disabled, with the reason beside it, while
 * Show or Episode has no column.
 */
export default function CheckFooter({
  episodes,
  missing,
  onAnotherFile,
  onImport,
}: Readonly<{
  episodes: number;
  missing: 'Series' | 'Episode' | null;
  onAnotherFile: () => void;
  onImport: () => void;
}>) {
  const label = `Import ${plural(episodes, 'episode')}`;
  const why = missing ? `Choose a column for ${missing}` : '';
  const start = missing ? undefined : onImport;
  return (
    <div className="flex items-center gap-3 border-white/8 border-t pt-6 max-md:flex-col max-md:items-stretch">
      <Button
        className="max-md:self-start"
        icon={arrowLeftGlyph}
        iconSize={15}
        onClick={onAnotherFile}
        variant="quiet"
      >
        Another file
      </Button>
      <span className="ml-auto text-meta leading-5 text-white/60 max-md:order-first max-md:ml-0 max-md:empty:hidden">
        {why}
      </span>
      <Button
        aria-disabled={missing ? true : undefined}
        className={SOLID_BUTTON}
        icon={downloadGlyph}
        iconSize={15}
        onClick={start}
        variant="primary"
      >
        {label}
      </Button>
    </div>
  );
}
