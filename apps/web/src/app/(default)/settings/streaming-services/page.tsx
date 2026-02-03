import { unauthorized } from 'next/navigation';
import { Suspense } from 'react';

import auth from '@/auth';
import SkeletonStreamingServices from '@/components/Settings/SkeletonStreamingServices';
import StreamingServicesContainer from '@/components/Settings/StreamingServicesContainer';

export default async function SettingsStreamingServicesPage() {
  const { accessToken } = await auth();

  if (!accessToken) {
    return unauthorized();
  }

  return (
    <Suspense fallback={<SkeletonStreamingServices />}>
      <StreamingServicesContainer />
    </Suspense>
  );
}
