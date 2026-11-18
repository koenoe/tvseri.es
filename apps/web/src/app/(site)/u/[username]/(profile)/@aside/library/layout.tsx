import type { ReactNode } from 'react';

import PageKindMarker from '../../_components/shell/PageKindMarker';
import type { ProfileParams } from '../../_data/profile';
import { ShelfAside } from '../../library/_components/ShelfNavigation';

/**
 * The Library's sidebar under the identity: the shelves. A slot
 * layout, so switching shelves re-renders only the empty leaf below it,
 * never the nav (or its count read).
 */
export default function LibraryAside({
  children,
  params,
}: Readonly<{ children: ReactNode; params: ProfileParams }>) {
  return (
    <>
      <PageKindMarker kind="subpage" />
      <ShelfAside params={params} />
      {children}
    </>
  );
}
