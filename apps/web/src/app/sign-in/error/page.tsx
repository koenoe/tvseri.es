import type { Metadata } from 'next';
import { Suspense } from 'react';

import Header from '@/components/header/Header';
import ButtonLink from '@/components/ui/button/ButtonLink';
import ErrorState from '@/components/ui/error/ErrorState';
import { SERVER_ERROR_STILL } from '@/components/ui/error/stills';
import { homeGlyph } from '@/components/ui/icon/glyphs';

import TryAgainLink from './TryAgainLink';

export const metadata: Metadata = { title: 'Sign-in broke' };

type Props = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

async function TryAgainFromParams({ searchParams }: Props) {
  const { returnTo } = await searchParams;
  return <TryAgainLink returnTo={returnTo} />;
}

/**
 * Where the auth callback sends a sign-in that failed on our side
 * (“Sign-in broke”): the 500 family with the site's own still.
 * The page is static; only Try again's return path is read from the URL,
 * inside Suspense, falling back to a login that returns home.
 */
export default function SignInErrorPage({ searchParams }: Props) {
  const tryAgain = (
    <Suspense fallback={<TryAgainLink returnTo="/" />}>
      <TryAgainFromParams searchParams={searchParams} />
    </Suspense>
  );
  const actions = (
    <>
      {tryAgain}
      <ButtonLink href="/" icon={homeGlyph} variant="glass">
        Home
      </ButtonLink>
    </>
  );
  return (
    <ErrorState
      actions={actions}
      body="Nothing changed on your account. Try again; if it keeps failing, use the other way to sign in."
      code="S05E00"
      header={<Header />}
      kicker="Something broke"
      still={SERVER_ERROR_STILL}
      title="Sign-in broke on our side."
    />
  );
}
