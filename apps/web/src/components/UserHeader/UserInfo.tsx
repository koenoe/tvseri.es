import { twMerge } from 'tailwind-merge';

import { cachedUser } from '@/app/cached';
import formatDate from '@/utils/formatDate';

export default async function UserInfo({
  className,
  username,
}: Readonly<{ username: string; className?: string }>) {
  const user = await cachedUser({ username });

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
          <svg
            className="size-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none">
              <path d="M0 0h24v24H0z"></path>
              <path d="M0 0h24v24H0z"></path>
            </g>
            <path d="M17 2c-.55 0-1 .45-1 1v1H8V3c0-.55-.45-1-1-1s-1 .45-1 1v1H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-1V3c0-.55-.45-1-1-1zm2 18H5V10h14v10zm-8-7c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm-4 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm8 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm-4 4c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm-4 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm8 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1z"></path>
          </svg>
          <span>Joined {formatDate(user.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
