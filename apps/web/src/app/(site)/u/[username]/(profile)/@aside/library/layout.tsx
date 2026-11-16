import type { ReactNode } from 'react';

import SubpageMarker from '../../_components/shell/SubpageMarker';
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
      <SubpageMarker />
      <ShelfAside params={params} />
      {children}
    </>
  );
}
