import { twMerge } from 'tailwind-merge';

import { CalendarIcon } from '@/components/Icons/CalendarIcon';
import { findUser } from '@/lib/api';
import formatDate from '@/utils/formatDate';

export default async function UserInfo({
  className,
  params,
}: Readonly<{
  params: Promise<{
    username: string;
  }>;
  className?: string;
}>) {
  const { username } = await params;
  const user = await findUser({ username });

  if (!user) {
    return null;
  }

  return (
    <div className={twMerge('flex flex-row items-center', className)}>
      <div className="flex w-full max-w-sm flex-col space-y-1 md:space-y-2">
        <span className="truncate whitespace-nowrap text-3xl md:text-4xl">
          {user.username}
        </span>
        <div className="flex items-center space-x-2 text-xs text-white/50 md:text-sm">
          <CalendarIcon className="size-5" />
          <span>Joined {formatDate(user.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
