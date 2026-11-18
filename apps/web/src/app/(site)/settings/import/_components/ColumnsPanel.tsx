'use client';

import { historyGlyph, infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import Dot from '@/components/ui/lane/Dot';

import type { ColumnMapping } from '../_lib/columns';
import { FIELDS } from '../_lib/copy';
import FieldRow, { type ColumnsProps } from './FieldRow';
import { CARD_COUNT, CARD_HEAD, CARD_TITLE, LINK } from './styles';

type Props = ColumnsProps;

const sameMapping = (a: ColumnMapping, b: ColumnMapping) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * "Edit columns": one row per field, name · select ·
 * (Streaming service only) "Column | Same for all rows" · a one-line hint,
 * every control 36px on one line. One column can feed several fields.
 */
export default function ColumnsPanel(props: Props) {
  const { mapping, onMapping, source } = props;
  const changed = !sameMapping(mapping, source.mapping);
  const reset = () => onMapping(source.mapping);

  return (
    <div className="flex flex-col gap-4 rounded-18 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]">
      <div className={CARD_HEAD}>
        <Dot colour="bg-white/75" />
        <h3 className={CARD_TITLE}>Columns</h3>
        <span className={CARD_COUNT}>tvseri.es field ← your CSV column</span>
        {changed ? (
          <span className="ml-auto flex items-center gap-2">
            <button className={LINK} onClick={reset} type="button">
              <Icon glyph={historyGlyph} size={13} />
              Back to what we filled in
            </button>
          </span>
        ) : null}
      </div>
      <div className="flex flex-col">
        {FIELDS.map((field) => (
          <FieldRow {...props} field={field} key={field.key} />
        ))}
      </div>
      <p className="flex items-center gap-2 text-meta leading-5 text-white/60">
        <Icon glyph={infoGlyph} size={13} />
        One column can fill several fields: Netflix puts the series, season and
        episode all in Title.
      </p>
    </div>
  );
}
