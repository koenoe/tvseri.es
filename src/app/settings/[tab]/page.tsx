import { Suspense } from 'react';

import { cookies } from 'next/headers';
import { notFound, unauthorized } from 'next/navigation';

// import Webhook from '@/components/Webhook/Webhook';
import ImportContainer from '@/components/Import/ImportContainer';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { decryptToken } from '@/lib/token';

const tabs = ['profile', 'import', 'webhooks'] as const;

export default async function SettingsPage({
  params,
}: Readonly<{
  params: Promise<
    Readonly<{
      tab: (typeof tabs)[number];
    }>
  >;
}>) {
  const { tab } = await params;
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return unauthorized();
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return unauthorized();
  }

  const user = await findUser({ userId: session.userId });

  if (!user) {
    return unauthorized();
  }

  if (!tabs.includes(tab)) {
    return notFound();
  }

  if (tab === 'profile') {
    return (
      <p className="text-sm italic">
        Soon you&apos;ll be able to edit your profile details here.
      </p>
    );
  }

  if (tab === 'import') {
    return (
      <Suspense
        fallback={
          <div className="relative grid h-52 w-full animate-pulse place-items-center rounded-xl bg-white/5 px-5 py-2.5 text-center">
            <div className="flex flex-col items-center justify-center pb-6 pt-5">
              <div className="mb-4 size-8" />
              <div className="mb-2 h-6 w-60 bg-white/10" />
              <div className="h-4 w-20 bg-white/5" />
            </div>
          </div>
        }
      >
        <ImportContainer />
      </Suspense>
    );
  }

  if (tab === 'webhooks') {
    return (
      <p className="text-sm italic">
        Soon you&apos;ll be able to configure webhooks for Plex and Jellyfin
        here.
      </p>
      // <div className="relative w-full">
      //   <h2 className="text-md mb-4 lg:text-lg">Plex</h2>
      //   <Webhook
      //     url={`${process.env.SITE_URL}/api/webhooks/plex?token=foobar`}
      //   />
      //   <h2 className="text-md mb-4 mt-10 lg:text-lg">Jellyfin</h2>
      //   <Webhook
      //     url={`${process.env.SITE_URL}/api/webhooks/jellyfin?token=foobar`}
      //   />
      // </div>
    );
  }

  return null;
}
