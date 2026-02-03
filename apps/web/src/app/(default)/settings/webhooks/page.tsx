import { unauthorized } from 'next/navigation';
import { Suspense } from 'react';

import auth from '@/auth';
import SkeletonWebhookForPlex from '@/components/Webhook/SkeletonWebhookForPlex';
import WebhookForPlex from '@/components/Webhook/WebhookForPlex';

export default async function SettingsWebhooksPage() {
  const { accessToken } = await auth();

  if (!accessToken) {
    return unauthorized();
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="relative w-full">
        <h2 className="text-md mb-4 lg:text-lg">Plex</h2>
        <Suspense fallback={<SkeletonWebhookForPlex />}>
          <WebhookForPlex accessToken={accessToken} />
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
