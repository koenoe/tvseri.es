import type { ReactNode } from 'react';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { statsGlyph } from '@/components/ui/icon/glyphs';
import statsPath from '@/lib/routing/statsPath';

import ErrorState from './ErrorState';
import HomeButton from './HomeButton';
import LoginButton from './LoginButton';
import { PROFILE_STILL, SIGN_IN_STILL } from './stills';

type Props = Readonly<{ header?: ReactNode }> &
  (
    | Readonly<{ variant: 'default' }>
    | Readonly<{
        /** The profile's owner (from the URL). */
        username: string;
        variant: 'profile';
        /**
         * The newest year their public Stats page has something to show:
         * the link goes there. `null`: they have nothing to show yet, so no
         * link and the copy says so. `'unknown'`: no such user, or the check
         * failed: nothing is claimed about them. `undefined` while
         * it is being checked: the sentence and button hold their
         * space, hidden.
         */
        statsYear: number | null | 'unknown' | undefined;
      }>
  );

const MEMBERS = 'Profiles are for members, and joining is free.';

/** The 401's body on a profile: the stats sentence only for what is known */
function ProfileBody({
  statsYear,
  username,
}: Readonly<{
  statsYear: number | null | 'unknown' | undefined;
  username: string;
}>) {
  if (statsYear === 'unknown') {
    return MEMBERS;
  }
  if (statsYear === null) {
    return `${MEMBERS} @${username} has no public stats yet.`;
  }
  const stats = `@${username}’s stats are public, so you can look at those now.`;
  return (
    <>
      {MEMBERS}{' '}
      {statsYear === undefined ? (
        <span aria-hidden className="invisible">
          {stats}
        </span>
      ) : (
        stats
      )}
    </>
  );
}

/**
 * The 401: Sign in comes straight back here. On someone's profile
 * (signed out), the way out is their public stats page, when it has
 * something to show: no dead ends (a new user's stats, an unknown handle).
 *
 * @example
 * <UnauthorizedView variant="default" />
 * <UnauthorizedView variant="profile" username="maria" statsYear={2026} />
 */
export default function UnauthorizedView(props: Props) {
  if (props.variant === 'profile') {
    const { header, statsYear, username } = props;
    const checking = statsYear === undefined;
    const statsLink =
      typeof statsYear === 'number' || checking ? (
        <ButtonLink
          aria-hidden={checking || undefined}
          className={checking ? 'invisible' : undefined}
          href={statsPath(username, statsYear ?? new Date().getUTCFullYear())}
          icon={statsGlyph}
          tabIndex={checking ? -1 : undefined}
          variant="glass"
        >
          {`See @${username}’s stats`}
        </ButtonLink>
      ) : null;
    const actions = (
      <>
        <LoginButton />
        {statsLink}
      </>
    );
    return (
      <ErrorState
        actions={actions}
        body={<ProfileBody statsYear={statsYear} username={username} />}
        code="S04E01"
        header={header}
        kicker="Sign in needed"
        still={PROFILE_STILL}
        title={`Sign in to see @${username}’s profile.`}
      />
    );
  }

  const actions = (
    <>
      <LoginButton />
      <HomeButton>Not now</HomeButton>
    </>
  );
  return (
    <ErrorState
      actions={actions}
      body="Your settings live in your account. Sign in with Google or an email code, and you’re straight back here."
      code="S04E01"
      header={props.header}
      kicker="Sign in needed"
      still={SIGN_IN_STILL}
      title="Sign in, so we know your name."
    />
  );
}
