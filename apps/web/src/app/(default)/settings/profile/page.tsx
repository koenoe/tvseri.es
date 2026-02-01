import { Suspense } from 'react';

import ProfileContainer from '@/components/Settings/ProfileContainer';

export default function SettingsProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-10 w-48 animate-pulse bg-white/10" />
          <div className="h-64 w-full animate-pulse rounded-lg bg-white/5" />
        </div>
      }
    >
      <ProfileContainer />
    </Suspense>
  );
}
