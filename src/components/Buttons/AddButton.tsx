'use client';

import { useCallback, useTransition } from 'react';

import { motion } from 'framer-motion';

import { useActionButtons } from './ActionButtonsProvider';
import CircleButton from './CircleButton';

export default function AddButton({
  action,
}: Readonly<{
  action: (value: boolean, listType: 'favorites' | 'watchlist') => void;
}>) {
  const [{ isWatchlisted }, setState] = useActionButtons();
  const [isPending, startTransition] = useTransition();
  const handleOnClick = useCallback(
    (value: boolean) => {
      setState((prevState) => ({
        ...prevState,
        isWatchlisted: value,
      }));
      startTransition(async () => {
        try {
          await action(value, 'watchlist');
        } catch (error) {
          console.error(error);
        }
      });
    },
    [action, setState],
  );

  return (
    <CircleButton
      isActive={isWatchlisted}
      onClick={handleOnClick}
      isDisabled={isPending}
    >
      <svg
        className="size-5 md:size-6"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isWatchlisted ? (
          <motion.polyline
            points="416 128 192 384 96 288"
            style={{
              fill: 'none',
              stroke: 'currentColor',
              strokeLinecap: 'square',
              strokeMiterlimit: 10,
              strokeWidth: '44px',
            }}
          />
        ) : (
          <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g
              id="uncollapse"
              fill="currentColor"
              transform="translate(64.000000, 64.000000)"
            >
              <motion.path d="M213.333333,1.42108547e-14 L213.333,170.666 L384,170.666667 L384,213.333333 L213.333,213.333 L213.333333,384 L170.666667,384 L170.666,213.333 L1.42108547e-14,213.333333 L1.42108547e-14,170.666667 L170.666,170.666 L170.666667,1.42108547e-14 L213.333333,1.42108547e-14 Z" />
            </g>
          </g>
        )}
      </svg>
    </CircleButton>
  );
}
