'use client';

import {
  type ChangeEvent,
  type KeyboardEvent,
  memo,
  type Ref,
  useCallback,
  useImperativeHandle,
} from 'react';

import { twMerge } from 'tailwind-merge';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import createUseRestorableState from '@/hooks/createUseRestorableState';

const useRestorableState = createUseRestorableState<string>();

export type SearchInputHandle = Readonly<{
  reset: () => void;
}>;

function SearchInput({
  className,
  color = DEFAULT_BACKGROUND_COLOR,
  onChange,
  onClose,
  onKeyDown,
  ref,
}: Readonly<{
  className?: string;
  color?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  ref?: Ref<SearchInputHandle>;
}>) {
  const [value, setValue] = useRestorableState('q', '');
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      onChange(event);
    },
    [onChange, setValue],
  );

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        setValue('');
      },
    }),
    [setValue],
  );

  return (
    <div
      className={twMerge('relative h-auto w-full', className)}
      style={{
        color: color,
      }}
    >
      <div className="absolute inset-y-0 start-0 flex items-center ps-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="size-6"
        >
          <path
            fill={color}
            fillRule="evenodd"
            d="M10.667 2a8.667 8.667 0 0 1 6.937 13.862l4.035 4.036a1.231 1.231 0 0 1-1.74 1.741l-4.037-4.035A8.667 8.667 0 1 1 10.667 2m0 2.667a6 6 0 1 0 0 12 6 6 0 0 0 0-12"
          />
        </svg>
      </div>
      <input
        autoComplete="off"
        autoCorrect="off"
        autoFocus
        className="block w-full bg-transparent p-6 ps-16 placeholder:opacity-50 focus:outline-none"
        data-1p-ignore
        placeholder="search tvseri.es"
        required
        spellCheck="false"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="absolute right-6 top-6 focus:outline-none"
        onClick={onClose}
      >
        <svg
          viewBox="0 0 15 15"
          xmlns="http://www.w3.org/2000/svg"
          className="size-6"
        >
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill={color}
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export default memo(SearchInput);
