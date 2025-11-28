import auth from '@/auth';
import SessionSyncClient from './SessionSyncClient';

export default async function SessionSync() {
  const { expiresAt } = await auth();

  if (!expiresAt) {
    return null;
  }

  return <SessionSyncClient expiresAt={expiresAt} />;
}
