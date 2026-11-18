import Link from 'next/link';

import Row from '@/components/ui/row/Row';
import RowError from '@/components/ui/row/RowError';
import { isUnavailable } from '@/lib/cache/unavailable';
import { getLensRow, LENS_ROWS } from '../../_data/lenses';
import HubPoster from '../HubPoster';
import LensRowClose from './LensRowClose';

/**
 * A Duration or Decade tile's shows, opened under the grid: the tile's
 * name, its meta line, a close button and the arrows. A
 * decade's name links to its landing.
 */
export default async function LensRow({ row }: Readonly<{ row: string }>) {
  const view = await getLensRow(row);
  if (isUnavailable(view)) {
    const title = LENS_ROWS.find((entry) => entry.key === row)?.title ?? '';
    const close = <LensRowClose row={row} title={title} />;
    return (
      <RowError
        actions={close}
        id={row}
        look="hubOpen"
        state="unavailable"
        title={title}
      />
    );
  }
  if (!view) {
    return null;
  }
  const titleContent = view.href ? (
    <Link className="transition-colors hover:text-white/80" href={view.href}>
      {view.title}
    </Link>
  ) : undefined;
  const line = view.line ? (
    <span className="shrink-0 text-meta text-white/60">{view.line}</span>
  ) : undefined;
  const close = <LensRowClose row={row} title={view.title} />;
  return (
    <Row
      actions={close}
      id={row}
      look="hubOpen"
      note={line}
      title={view.title}
      titleContent={titleContent}
    >
      {view.items.length ? (
        view.items.map((show) => <HubPoster key={show.id} show={show} />)
      ) : (
        <p className="text-body-sm text-white/60" key="empty">
          No series here yet.
        </p>
      )}
    </Row>
  );
}
