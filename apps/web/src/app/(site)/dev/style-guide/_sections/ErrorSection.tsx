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
    <Section
      id="errors"
      source="ERFinal (part 2, the final)"
      title="Error pages"
    >
      <p className="text-body-sm text-white/60">
        Frames are at 50% of ERFinal’s 1440 × 810 desktop frame; the phone
        layout shows below 768px. The real 404 is any unknown URL in a
        production build (/breaking-bad fills the search with “breaking bad”).
        Each headline takes focus on load, as on the real page.
      </p>
      {NOT_FOUND_STILLS.map((still) => (
        <Specimen
          board={`ERFinal 404 · ${still.id} (app/not-found.tsx, static)`}
          key={still.id}
          label={`404 · ${still.credit}`}
        >
          <Frame>
            <NotFoundView shows={TRENDING} still={still} />
          </Frame>
        </Specimen>
      ))}
      <Specimen board="ERFinal 401 · settings (unauthorized())" label="401">
        <Frame>
          <UnauthorizedView variant="default" />
        </Frame>
      </Specimen>
      <Specimen
        board="ERFinal 401 · someone's profile, signed out"
        label="401 · profile"
      >
        <Frame>
          <UnauthorizedView
            statsYear={2026}
            username="maria"
            variant="profile"
          />
        </Frame>
      </Specimen>
      <Specimen board="ERFinal 403 · admin only (forbidden())" label="403">
        <Frame>
          <ForbiddenView />
        </Frame>
      </Specimen>
      <Specimen board="ERFinal 500 (app/error.tsx)" label="500">
        <Frame>
          <ServerErrorView errorId="7f3a91c2" retry={<RefreshButton />} />
        </Frame>
      </Specimen>
      <Specimen
        board="ERFinal data down (a DataDownError in app/error.tsx)"
        label="Data down"
      >
        <Frame>
          <DataDownView />
        </Frame>
      </Specimen>
      <Specimen
        board="ERFinal offline (navigator.onLine false in app/error.tsx)"
        label="Offline · test card"
      >
        <Frame>
          <OfflineView retry={<RefreshButton />} />
        </Frame>
      </Specimen>
    </Section>
  );
}
