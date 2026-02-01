import { Suspense } from 'react';
import WebhooksContainer from '@/components/Settings/WebhooksContainer';
import { plexStyles } from '@/components/Webhook/WebhookForPlex';

export default function SettingsWebhooksPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="relative w-full">
            <h2 className="text-md mb-4 lg:text-lg">Plex</h2>
            <div
              className={plexStyles({
                className:
                  'flex h-28 w-full items-center justify-center rounded-lg px-8 shadow-lg',
              })}
            >
              <div className="h-12 w-full animate-pulse rounded-lg bg-black/20" />
            </div>
          </div>
        </div>
      }
    >
      <WebhooksContainer />
    </Suspense>
  );
}
