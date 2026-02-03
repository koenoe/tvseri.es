import { unauthorized } from 'next/navigation';
import { Suspense } from 'react';

import auth from '@/auth';
import ImportContainer from '@/components/Import/ImportContainer';
import SkeletonImport from '@/components/Import/SkeletonImport';

export default async function SettingsImportPage() {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  return (
    <Suspense fallback={<SkeletonImport />}>
      <ImportContainer />
    </Suspense>
  );
}
