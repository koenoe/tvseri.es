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

import { CrossIcon } from '@/components/Icons/CrossIcon';
import { SearchIcon } from '@/components/Icons/SearchIcon';
import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import createUseRestorableState from '@/hooks/createUseRestorableState';

const useRestorableState = createUseRestorableState<string>();

export type SearchInputHandle = Readonly<{
  reset: () => void;
}>;

function SearchInput({
  autoFocus = true,
  placeholder = 'search tvseri.es',
  className,
  color = DEFAULT_BACKGROUND_COLOR,
  alwaysShowCloseButton = true,
  onChange,
  onClose,
  onKeyDown,
  ref,
}: Readonly<{
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  color?: string;
  alwaysShowCloseButton?: boolean;
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

  const handleClose = useCallback(() => {
    setValue('');
    onClose();
  }, [setValue, onClose]);

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
        color,
      }}
    >
      <div className="absolute inset-y-0 start-0 flex items-center ps-6">
        <SearchIcon className="size-6" fill={color} />
      </div>
      <input
        autoComplete="off"
        autoCorrect="off"
        autoFocus={autoFocus}
        className="block w-full bg-transparent p-6 ps-16 placeholder:opacity-50 focus:outline-none"
        data-1p-ignore
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required
        spellCheck="false"
        type="text"
        value={value}
      />
      <button
        className={twMerge(
          'absolute right-6 top-6 focus:outline-none',
          !alwaysShowCloseButton && !value && 'hidden',
        )}
        onClick={handleClose}
        type="button"
      >
        <CrossIcon className="size-6" fill={color} />
      </button>
    </div>
  );
}

export default memo(SearchInput);
