import { Suspense } from 'react';
import SignOutForm from '@/components/auth/SignOutForm';
import { BELOW_FLOATING_HEADER_LG } from '@/components/header/belowFloatingHeader';
import { logOutGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { getSettingsSession } from '../_data/session';
import { SETTINGS_SECTIONS } from '../_lib/sections';
import LineSkeleton from './LineSkeleton';
import NavRow from './NavRow';
import NavStateLine from './NavStateLines';

async function SignedInEmail() {
  const { user } = await getSettingsSession();
  return user.email ?? `@${user.username}`;
}

const NAV_CLASSES = `flex flex-col gap-2 lg:sticky lg:top-8 lg:rounded-[20px] lg:bg-white/3.5 lg:p-2 lg:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] ${BELOW_FLOATING_HEADER_LG}`;

/**
 * The five sections and Sign out: the 248px glass sidebar from `lg`,
 * a list of row cards below it. Labels are static; each state line
 * streams into its own hole.
 */
export default function SettingsNav() {
  return (
    <nav aria-label="Settings" className={NAV_CLASSES}>
      <ul className="flex flex-col gap-2 lg:gap-0.5">
        {SETTINGS_SECTIONS.map(({ glyph, href, id, label }) => (
          <NavRow glyph={glyph} href={href} key={id} label={label}>
            <Suspense fallback={<LineSkeleton />}>
              <NavStateLine id={id} />
            </Suspense>
          </NavRow>
        ))}
      </ul>
      <hr className="my-1 h-px border-0 bg-white/7 max-lg:my-4 lg:mx-4" />
      <SignOutForm>
        <button
          className="grid w-full cursor-pointer grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 rounded-12 px-4 py-3 text-left text-white/60 transition-[background-color] hover:bg-white/5 hover:text-white"
          type="submit"
        >
          <Icon className="row-span-2" glyph={logOutGlyph} size={16} />
          <span className="text-body-sm font-medium text-white/80">
            Sign out
          </span>
          <small className="col-start-2 truncate text-caption text-white/60">
            <Suspense fallback={<LineSkeleton />}>
              <SignedInEmail />
            </Suspense>
          </small>
        </button>
      </SignOutForm>
    </nav>
  );
}
