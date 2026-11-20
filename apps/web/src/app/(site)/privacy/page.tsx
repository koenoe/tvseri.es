import type { Metadata } from 'next';
import Link from 'next/link';

import Page from '@/components/background/Page';
import {
  downloadGlyph,
  extensionGlyph,
  globeGlyph,
  helpGlyph,
  inboxGlyph,
  lockGlyph,
  statsGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';

import PrivacySection from './_components/PrivacySection';

export const metadata: Metadata = {
  description:
    'What tvseri.es keeps about you, where it lives, and how to download or delete it.',
  title: 'Privacy',
};

const ISSUES_URL = 'https://github.com/koenoe/tvseri.es/issues';

/**
 * The privacy page: a static text page in the settings pages' type, plain
 * on the page (no cards), written from what the code does. No data, no viewer:
 * the whole page is the static shell.
 */
export default function PrivacyPage() {
  return (
    <Page>
      <div
        className="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter"
        data-testid="route-privacy"
      >
        <header className="flex max-w-[808px] flex-col gap-3 pt-6 pb-2 md:pt-7 md:pb-6">
          <h1 className="font-display text-display">Privacy</h1>
          <p className="max-w-160 text-body text-white/60">
            What we keep about you, where it lives, and how to download or
            delete it.
          </p>
        </header>
        <div className="flex max-w-[808px] flex-col gap-8">
          <PrivacySection icon={inboxGlyph} id="stored" title="What we store">
            <ul>
              <li>Your email address, and your name if you use Google.</li>
              <li>Your username, and the country you first signed in from.</li>
              <li>Episodes you watch or skip, with dates.</li>
              <li>Your watchlist, favourites and who you follow.</li>
              <li>Per-series choices, like hiding one from In progress.</li>
              <li>Your streaming services.</li>
              <li>
                With Plex: a private webhook address, the plays it reports, and
                its account names (to pick whose plays count).
              </li>
              <li>
                With an import: only the episodes your browser matches in the
                file, plus a note to undo it.
              </li>
              <li>
                With a connected streaming service: its sign-in, encrypted, the
                profile it reads, and entries the sync couldn’t match.
              </li>
            </ul>
            <p>
              Other signed-in people see your profile: what you watch, your
              lists and favourites. Signed out, it shows nothing.
            </p>
          </PrivacySection>

          <PrivacySection
            icon={lockGlyph}
            id="cookies"
            title="Cookies and this browser"
          >
            <ul>
              <li>
                Signing in sets two one-year cookies: your session (hidden from
                scripts) and your username (for the header).
              </li>
              <li>A 10-minute cookie protects the sign-in.</li>
              <li>A 10-minute cookie says welcome once to new accounts.</li>
              <li>
                Your browser keeps recent searches, your region and placeholder
                hints (like which series you track), never sent to us.
              </li>
            </ul>
            <p>No ads, no tracking cookies.</p>
          </PrivacySection>

          <PrivacySection
            icon={extensionGlyph}
            id="extension"
            title="The Chrome extension"
          >
            <ul>
              <li>
                It acts only when you press Connect on a service in{' '}
                <Link href="/settings/connected-apps">
                  Settings › Connected apps
                </Link>{' '}
                and then Continue in its popup.
              </li>
              <li>
                Then it sends that service’s sign-in cookies (Netflix, BBC
                iPlayer or Prime Video) to us once, over HTTPS, with a one-time
                code. Never your password.
              </li>
              <li>
                We check they work, encrypt them (AES-256-GCM, with a key held
                in AWS KMS) and store them in London.
              </li>
              <li>
                Only the nightly sync can decrypt them. It reads your watch
                history on that service and marks the episodes you finished. It
                never plays, changes or buys anything there.
              </li>
              <li>
                The extension keeps only the last result per service in this
                browser. It doesn’t read your browsing.
              </li>
            </ul>
            <p>
              Disconnect deletes the stored sign-in at once; your synced
              episodes stay, and where the sync got to, so connecting again
              carries on.
            </p>
          </PrivacySection>

          <PrivacySection
            icon={statsGlyph}
            id="measuring"
            title="Measuring speed"
          >
            <p>
              One in four page loads reports its speed: page address, device
              type, user agent and country. No cookie, no account.
            </p>
            <p>
              The server logs requests (address, status, timing, country) to
              spot slow or broken pages. Both go after 7 days; daily totals
              after 30.
            </p>
          </PrivacySection>

          <PrivacySection icon={globeGlyph} id="where" title="Where it lives">
            <p>
              Your account and marks are stored with Amazon Web Services in
              London. The site runs on Vercel.
            </p>
          </PrivacySection>

          <PrivacySection
            icon={usersGlyph}
            id="others"
            title="Who else sees something"
          >
            <ul>
              <li>Google, if you sign in with it.</li>
              <li>
                Amazon’s email service, which gets your email address to send
                sign-in codes.
              </li>
              <li>
                TMDB, for series data. It sees your IP address when your browser
                loads its images. We send it nothing about you.
              </li>
              <li>OMDb, for IMDb ratings. We ask about series, never you.</li>
              <li>Plex, if connected: it sends us your plays.</li>
              <li>
                Netflix, BBC iPlayer and Prime Video, if connected: our sync
                reads your watch history there, signed in as you.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection
            icon={downloadGlyph}
            id="your-data"
            title="Take it or delete it"
          >
            <p>
              In <Link href="/settings/data">Settings › Your data</Link> you can
              download your watch history (CSV) or everything (JSON).
            </p>
            <p>
              Deleting your account there removes your marks, lists, follows,
              settings and Plex link, then the account.
            </p>
          </PrivacySection>

          <PrivacySection icon={helpGlyph} id="questions" title="Questions">
            <p>
              Open an issue on{' '}
              <a href={ISSUES_URL} rel="noopener noreferrer" target="_blank">
                the project’s GitHub repository
              </a>
              .
            </p>
          </PrivacySection>
        </div>
      </div>
    </Page>
  );
}
