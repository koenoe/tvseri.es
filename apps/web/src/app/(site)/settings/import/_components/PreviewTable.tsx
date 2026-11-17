import Image from 'next/image';

import { variantFilmStripGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import type { FieldKey } from '../_lib/copy';
import type { PreviewHead, PreviewRow } from '../_lib/previewTable';

const WIDTH: Readonly<Record<FieldKey, string>> = {
  date: 'w-[13%]',
  episode: 'w-[28%]',
  season: 'w-[9%]',
  service: 'w-[16%]',
  show: 'w-[34%]',
};

const CELL =
  'flex min-w-0 items-center gap-3 whitespace-nowrap text-body-sm tabular-nums';
const TEXT = 'min-w-0 truncate';
/** Phones: the row is a card (show · date over episode · service) */
const PHONE_SMALL = 'max-md:text-caption max-md:text-white/60';

const PHONE_CELL = cn(CELL, PHONE_SMALL);
const SHOW_CELL = cn(CELL, 'font-semibold max-md:block max-md:truncate');
const TR_CLASS_BASE =
  'max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-0.5 max-md:border-white/5 max-md:border-t max-md:px-3.5 max-md:py-3 max-md:first:border-t-0 max-md:[&:nth-child(n+4)]:hidden';

/**
 * The first rows as they will be read: fixed columns,
 * 64px rows, a poster from the match, one line each with the whole text on
 * hover. The source is named once, in the header. A film is muted with
 * "Skipped · a film?". On phones each row is a small card and Season goes
 * (it is part of the episode line there).
 */
export default function PreviewTable({
  heads,
  rows,
}: Readonly<{
  heads: ReadonlyArray<PreviewHead>;
  rows: ReadonlyArray<PreviewRow>;
}>) {
  return (
    <div className="overflow-hidden rounded-18 bg-white/2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]">
      <table className="w-full table-fixed border-collapse max-md:block">
        <thead className="max-md:hidden">
          <tr>
            {heads.map((head) => {
              const headClass = cn(
                'h-13.5 bg-white/4 px-4 text-left align-middle',
                WIDTH[head.key],
              );
              const labelClass = cn(
                'block text-overline uppercase',
                head.needed ? 'text-white' : 'text-white/60',
              );
              const sourceClass = cn(
                'mt-1 block truncate text-caption',
                head.needed ? 'text-white' : 'text-white/60',
              );
              return (
                <th className={headClass} key={head.key} scope="col">
                  <span className={labelClass}>{head.label}</span>
                  <span className={sourceClass}>{head.source}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {rows.map((row) => (
            <PreviewTableRow key={row.key} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewTableRow({ row }: Readonly<{ row: PreviewRow }>) {
  const td =
    'h-16 border-white/5 border-t px-4 align-middle max-md:block max-md:h-auto max-md:border-0 max-md:p-0';
  const muted = row.isFilm ? 'text-white/60' : 'text-white';
  const rowClass = cn(TR_CLASS_BASE, muted);
  const seasonCellClass = cn(td, 'max-md:hidden');
  const episodeCellClass = cn(td, 'max-md:col-start-1 max-md:row-start-2');
  const dateCellClass = cn(
    td,
    'max-md:col-start-2 max-md:row-start-1 max-md:justify-self-end',
  );
  const serviceCellClass = cn(
    td,
    'max-md:col-start-2 max-md:row-start-2 max-md:justify-self-end',
  );
  return (
    <tr className={rowClass}>
      <td className={td}>
        <span className={SHOW_CELL} title={row.show}>
          {row.poster ? (
            <Image
              alt=""
              className="h-12 w-8 shrink-0 rounded-6 object-cover shadow-[0_6px_14px_-6px_rgb(0_0_0/0.6)] max-md:hidden"
              height={48}
              src={row.poster}
              width={32}
            />
          ) : (
            <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded-6 bg-white/6 text-white/60 max-md:hidden">
              <Icon glyph={variantFilmStripGlyph} size={13} />
            </span>
          )}
          <span className={TEXT}>{row.show}</span>
        </span>
      </td>
      <td className={seasonCellClass}>
        <span className={CELL}>{row.season}</span>
      </td>
      <td className={episodeCellClass}>
        {row.isFilm ? (
          <span className={CELL}>
            <span className="inline-flex h-6 items-center rounded-full px-2.5 text-caption font-medium text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]">
              Skipped · a film?
            </span>
          </span>
        ) : (
          <span className={PHONE_CELL} title={row.episode}>
            <span className={TEXT}>{row.episode}</span>
          </span>
        )}
      </td>
      <td className={dateCellClass}>
        <span className={PHONE_CELL}>{row.date}</span>
      </td>
      <td className={serviceCellClass}>
        <span className={PHONE_CELL} title={row.service}>
          {row.serviceLogo ? (
            <Image
              alt=""
              className="size-5.5 shrink-0 rounded-6"
              height={22}
              src={row.serviceLogo}
              width={22}
            />
          ) : null}
          <span className={TEXT}>{row.service}</span>
        </span>
      </td>
    </tr>
  );
}
