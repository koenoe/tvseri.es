import DataDownView from '@/components/ui/error/DataDownView';
import ForbiddenView from '@/components/ui/error/ForbiddenView';
import NotFoundView from '@/components/ui/error/NotFoundView';
import type { NotFoundShow } from '@/components/ui/error/notFoundShow';
import OfflineView from '@/components/ui/error/OfflineView';
import RefreshButton from '@/components/ui/error/RefreshButton';
import ServerErrorView from '@/components/ui/error/ServerErrorView';
import { NOT_FOUND_STILLS } from '@/components/ui/error/stills';
import UnauthorizedView from '@/components/ui/error/UnauthorizedView';

import Section from './Section';
import { Specimen } from './Specimen';

/**
 * Each error page in a 1440 × 810 frame (the desktop frame) scaled to
 * fit; the live 404 is any unknown URL (e.g. /shows/breaking-bad), and the
 * frames turn into the phone layout below 768px.
 */
function Frame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-[405px] w-full max-w-180 overflow-hidden rounded-12 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
      <div className="h-[810px] w-[1440px] origin-top-left scale-50 [&>div]:min-h-[810px]">
        {children}
      </div>
    </div>
  );
}

const POSTER = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2';

/** The five posters (real TMDB shows), as /collection/trending sends them. */
const TRENDING: ReadonlyArray<NotFoundShow> = [
  [225171, 'pluribus', 'Pluribus', '/z7Nga7Q9IGFWs5OEduY2gGFxnX3.jpg'],
  [250307, 'the-pitt', 'The Pitt', '/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg'],
  [95480, 'slow-horses', 'Slow Horses', '/AdYr4DjOgXvDUMwu6vEhZy1Rnxk.jpg'],
  [70523, 'dark', 'Dark', '/wiiyc3m6HKaQhFBYeuM7ySCNQsG.jpg'],
  [247767, 'the-studio', 'The Studio', '/2c6ofLTa5CRfeQjVA1bWiYBdxQN.jpg'],
].map(([id, slug, title, path]) => ({
  id: Number(id),
  poster: `${POSTER}${path}`,
  slug: String(slug),
  title: String(title),
}));

export default function ErrorSection() {
  return (
    <Section id="errors" source="the error pages" title="Error pages">
      <p className="text-body-sm text-white/60">
        Frames are at 50% of a 1440 × 810 desktop frame; the phone layout shows
        below 768px. The real 404 is any unknown URL in a production build
        (/breaking-bad fills the search with “breaking bad”). Each headline
        takes focus on load, as on the real page.
      </p>
      {NOT_FOUND_STILLS.map((still) => {
        const label = `404 · ${still.credit}`;
        const note = `404 · ${still.id} (app/not-found.tsx, static)`;
        return (
          <Specimen key={still.id} label={label} note={note}>
            <Frame>
              <NotFoundView shows={TRENDING} still={still} />
            </Frame>
          </Specimen>
        );
      })}
      <Specimen label="401" note="401 · settings (unauthorized())">
        <Frame>
          <UnauthorizedView variant="default" />
        </Frame>
      </Specimen>
      <Specimen
        label="401 · profile"
        note="401 · someone's profile, signed out"
      >
        <Frame>
          <UnauthorizedView
            statsYear={2026}
            username="maria"
            variant="profile"
          />
        </Frame>
      </Specimen>
      <Specimen label="403" note="403 · admin only (forbidden())">
        <Frame>
          <ForbiddenView />
        </Frame>
      </Specimen>
      <Specimen label="500" note="500 (app/error.tsx)">
        <Frame>
          <ServerErrorView errorId="7f3a91c2" retry={<RefreshButton />} />
        </Frame>
      </Specimen>
      <Specimen
        label="Data down"
        note="Data down (a DataDownError in app/error.tsx)"
      >
        <Frame>
          <DataDownView />
        </Frame>
      </Specimen>
      <Specimen
        label="Offline · test card"
        note="Offline (navigator.onLine false in app/error.tsx)"
      >
        <Frame>
          <OfflineView retry={<RefreshButton />} />
        </Frame>
      </Specimen>
    </Section>
  );
}
