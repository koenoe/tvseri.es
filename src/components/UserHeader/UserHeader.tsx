import { twMerge } from 'tailwind-merge';

import { findUser } from '@/lib/db/user';

import AddButton from '../Buttons/AddButton';
import ContextMenuButton from '../Buttons/ContextMenuButton';

export default async function UserHeader({
  className,
  username,
}: Readonly<{ username: string; className?: string }>) {
  const user = await findUser({ username });

  if (!user) {
    return null;
  }

  return (
    <div
      className={twMerge(
        'flex items-center justify-center space-x-6',
        className,
      )}
    >
      <div className="flex flex-row items-center">
        <div className="flex w-full flex-col">
          <span className="text-2xl font-semibold">
            {user.name || user.username}
          </span>
          <span className="text-xs text-white/50">
            {user.name ? `${user.username} – ` : ''}member since{' '}
            {new Date(user.createdAt).getFullYear()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-2">
        <AddButton title={`Follow '${user.username}'`} size="small" />
        <ContextMenuButton size="small">todo</ContextMenuButton>
      </div>
    </div>
  );
}
