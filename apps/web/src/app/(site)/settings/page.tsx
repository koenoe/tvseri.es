import type { Metadata } from 'next';

import { FIRST_SECTION } from './_lib/sections';
import ProfilePage from './profile/_components/ProfilePage';

export const metadata: Metadata = {
  alternates: { canonical: FIRST_SECTION },
};

/**
 * `/settings`: below lg the header and the section list (drawn by
 * the layout) and nothing here; from lg the first section, Profile, beside
 * the sidebar. Both are in the static HTML and CSS picks one, so
 * no width is guessed on the server and nothing swaps after the first paint.
 * The section is rendered once (one form, one set of ids); below lg its
 * wrapper is `display: none`, and its data streams in its own hole, so the
 * phone's list never waits for it.
 */
export default function Page() {
  return (
    <div className="hidden lg:block">
      <ProfilePage />
    </div>
  );
}
