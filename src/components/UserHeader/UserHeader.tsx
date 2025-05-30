import { twMerge } from 'tailwind-merge';

import { findUser } from '@/lib/db/user';

import CircleButton from '../Buttons/CircleButton';
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
      {/* <img
            className="aspect-square size-20 rounded-full object-cover"
            src="https://secure.gravatar.com/avatar/19efa849d22760d5e3478f2e35ac93c4.jpg?s=150"
            alt=""
          /> */}

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
        <CircleButton title={`Follow '${user.username}'`} size="small">
          <svg
            className="size-3 md:size-4"
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
              <g
                id="uncollapse"
                fill="currentColor"
                transform="translate(64.000000, 64.000000)"
              >
                <path d="M213.333333,1.42108547e-14 L213.333,170.666 L384,170.666667 L384,213.333333 L213.333,213.333 L213.333333,384 L170.666667,384 L170.666,213.333 L1.42108547e-14,213.333333 L1.42108547e-14,170.666667 L170.666,170.666 L170.666667,1.42108547e-14 L213.333333,1.42108547e-14 Z" />
              </g>
            </g>
          </svg>
        </CircleButton>
        <ContextMenuButton size="small">todo</ContextMenuButton>
      </div>
    </div>
  );
}
