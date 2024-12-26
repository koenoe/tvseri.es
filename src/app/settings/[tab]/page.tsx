import { cookies } from 'next/headers';
import { notFound, unauthorized } from 'next/navigation';

import FileUploader from '@/components/FileUploader/FileUploader';
import Webhook from '@/components/Webhook/Webhook';
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
      <FileUploader
        accept={{ 'text/csv': [] }}
        multiple={false}
        maxSize={4 * 1024 * 1024}
        maxFileCount={1}
      />
    );
  }

  if (tab === 'webhooks') {
    return (
      <div className="relative w-full">
        <h2 className="text-md mb-4 lg:text-lg">Plex</h2>
        <Webhook
          url={`${process.env.SITE_URL}/api/webhooks/plex?token=foobar`}
        />
        <h2 className="text-md mb-4 mt-10 lg:text-lg">Jellyfin</h2>
        <Webhook
          url={`${process.env.SITE_URL}/api/webhooks/jellyfin?token=foobar`}
        />
      </div>
    );
  }

  return null;
}
