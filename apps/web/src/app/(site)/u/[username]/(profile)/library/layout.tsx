import type { ReactNode } from 'react';

import type { ProfileParams } from '../_data/profile';
import { ShelfChipRow } from './_components/ShelfNavigation';

/**
 * Every Library page: on a phone the shelf chips under the tabs, then the shelf. A layout, so a shelf switch keeps them.
 */
export default function LibraryLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: ProfileParams }>) {
  return (
    <div className="flex flex-col max-lg:gap-6">
      <ShelfChipRow params={params} />
      {children}
    </div>
  );
}
