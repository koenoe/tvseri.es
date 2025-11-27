import { unauthorized } from 'next/navigation';
import { Suspense } from 'react';
import auth from '@/auth';
import StreamingServicesContainer from '@/components/Settings/StreamingServicesContainer';

export default async function SettingsStreamingServicesPage() {
  const { accessToken } = await auth();

  if (!accessToken) {
    return unauthorized();
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="bg-neutral-900">
            <div className="rounded-lg bg-white/5 p-3 h-[5.5rem] flex items-center justify-center">
              <div className="relative h-6 w-56 bg-white/10" />
            </div>
          </div>
          <div className="bg-neutral-900">
            <div className="rounded-lg bg-white/5 py-3 px-6 h-[4.5rem] flex items-center justify-start gap-6">
              <div className="size-6 bg-white/10 animate-pulse rounded-full" />
              <div className="relative h-6 w-48 bg-white/5" />
            </div>
          </div>
          <div className="bg-neutral-900">
            <div className="rounded-lg bg-white/5 p-4 md:p-6">
              <div className="flex flex-col gap-2">
                {[...Array(10)].map((_, index) => (
                  <div
                    className="relative flex flex-row gap-3 overflow-hidden rounded-lg bg-black/10 p-3 md:flex-row md:items-center md:gap-4 md:p-4"
                    key={index}
                  >
                    <div className="relative aspect-square size-10 overflow-hidden rounded-md bg-white/10">
                      <div className="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    </div>
                    <div className="h-5 w-32 bg-white/10" />
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3 md:relative md:right-auto md:top-auto md:ml-auto md:-translate-y-0 md:gap-4">
                      <div className="h-8 w-16 bg-white/10 rounded-2xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <StreamingServicesContainer />
    </Suspense>
  );
}
