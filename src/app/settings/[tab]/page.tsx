import { Suspense } from 'react';

import { cookies } from 'next/headers';
import { notFound, unauthorized } from 'next/navigation';

import ImportContainer from '@/components/Import/ImportContainer';
import { tabs, type Tab } from '@/components/Tabs/Tabs';
import WebhookForPlex from '@/components/Webhook/WebhookForPlex';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { decryptToken } from '@/lib/token';

export default async function SettingsPage({
  params,
}: Readonly<{
  params: Promise<
    Readonly<{
      tab: Tab;
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

  // if (tab === 'profile') {
  //   return (
  //     <p className="text-sm italic">
  //       Soon you&apos;ll be able to edit your profile details here.
  //     </p>
  //   );
  // }

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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="relative w-full">
          <h2 className="text-md mb-4 lg:text-lg">Plex</h2>
          <Suspense
            fallback={
              <div className="relative flex h-28 w-full animate-pulse rounded-lg bg-white/10 shadow-lg" />
            }
          >
            <WebhookForPlex userId={user.id} />
          </Suspense>
        </div>
        {/* <div className="relative w-full">
          <h2 className="text-md mb-4 lg:text-lg">Jellyfin</h2>
          <Webhook className="bg-gradient-to-br from-[#aa5cc3] to-[#00a4dc]" />
        </div>
        <div className="relative w-full">
          <h2 className="text-md mb-4 lg:text-lg">Emby</h2>
          <Webhook className="bg-gradient-to-br from-[#4caf50] to-[#357a38]" />
        </div> */}
      </div>
    );
  }

  return null;
}
