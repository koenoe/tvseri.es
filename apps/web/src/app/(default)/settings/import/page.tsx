import { unauthorized } from 'next/navigation';
import { Suspense } from 'react';

import auth from '@/auth';
import ImportContainer from '@/components/Import/ImportContainer';

export default async function SettingsImportPage() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

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
