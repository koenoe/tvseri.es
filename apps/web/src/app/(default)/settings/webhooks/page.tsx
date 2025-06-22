import { Suspense } from 'react';

import { unauthorized } from 'next/navigation';

import auth from '@/auth';
import WebhookForPlex, {
  plexStyles,
} from '@/components/Webhook/WebhookForPlex';

export default async function SettingsWebhooksPage() {
  const { encryptedSessionId } = await auth();

  if (!encryptedSessionId) {
    return unauthorized();
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="relative w-full">
        <h2 className="text-md mb-4 lg:text-lg">Plex</h2>
        <Suspense
          fallback={
            <div
              className={plexStyles({
                className:
                  'flex h-28 w-full items-center justify-center rounded-lg px-8 shadow-lg',
              })}
            >
              <div className="h-12 w-full animate-pulse rounded-lg bg-black/20" />
            </div>
          }
        >
          <WebhookForPlex encryptedSessionId={encryptedSessionId} />
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
