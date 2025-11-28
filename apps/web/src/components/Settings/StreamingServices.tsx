'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import Image from 'next/image';
import {
  useCallback,
  useMemo,
  useOptimistic,
  useReducer,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import SearchInput from '../Search/SearchInput';
import StreamingService from './StreamingService';

export type WatchProviderAction = Readonly<{
  type: 'add' | 'remove';
  provider: WatchProvider;
}>;

const reducer = (
  state: WatchProvider[],
  { type, provider }: WatchProviderAction,
) => {
  switch (type) {
    case 'add': {
      if (state.some((p) => p.id === provider.id)) {
        return state;
      }
      return [...state, provider];
    }
    case 'remove': {
      return state.filter((p) => p.id !== provider.id);
    }
    default: {
      return state;
    }
  }
};

export default function StreamingServices({
  action,
  providers,
  initialSelected = [],
}: Readonly<{
  action: (watchProviders: WatchProvider[]) => Promise<void>;
  providers: WatchProvider[];
  initialSelected?: WatchProvider[];
}>) {
  const [, startTransition] = useTransition();
  const [selected, dispatch] = useReducer(reducer, initialSelected);
  const [optimisticSelected, optimisticDispatch] = useOptimistic(
    selected,
    reducer,
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProviders = useMemo(() => {
    if (!searchTerm.trim()) {
      return providers;
    }
    return providers.filter((provider) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [providers, searchTerm]);

  const handleSelect = useCallback(
    (provider: WatchProvider, isSelected: boolean) => {
      const actionType = isSelected ? 'add' : 'remove';

      startTransition(async () => {
        optimisticDispatch({ provider, type: actionType });

        try {
          const newSelected = isSelected
            ? [...selected, provider]
            : selected.filter((p: WatchProvider) => p.id !== provider.id);

          await action(newSelected);
          dispatch({ provider, type: actionType });
        } catch (_) {
          toast.error('Something went wrong. Please try again.');
        }
      });
    },
    [action, selected, optimisticDispatch],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    [],
  );

  const handleSearchReset = useCallback(() => {
    setSearchTerm('');
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-neutral-900">
        <div className="rounded-lg bg-white/5 p-3">
          <div className="scrollbar-hide flex flex-nowrap space-x-4 h-16 overflow-x-auto items-center md:justify-center">
            {optimisticSelected.length > 0 ? (
              optimisticSelected.map((provider) => (
                <button
                  className="relative size-12 shrink-0"
                  key={provider.id}
                  onClick={() => handleSelect(provider, false)}
                >
                  <Image
                    alt={provider.name}
                    className="overflow-hidden rounded-md aspect-square w-full h-full"
                    height={128}
                    src={provider.logo}
                    unoptimized
                    width={128}
                  />
                  <div className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-neutral-500">
                    <svg
                      className="size-3"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12h14"
                        stroke="white"
                        strokeLinecap="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center text-neutral-400 text-sm w-full">
                Please select your streaming services
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="bg-neutral-900">
        <SearchInput
          alwaysShowCloseButton={false}
          autoFocus={false}
          className="rounded-lg bg-white/5"
          color="white"
          onChange={handleSearchChange}
          onClose={handleSearchReset}
          placeholder="Filter streaming services"
        />
      </div>
      <div className="bg-neutral-900">
        <div className="rounded-lg bg-white/5 p-4 md:p-6">
          <div className="flex flex-col gap-2">
            {filteredProviders.length > 0 ? (
              filteredProviders.map((provider) => (
                <StreamingService
                  isSelected={optimisticSelected.some(
                    (p) => p.id === provider.id,
                  )}
                  key={provider.id}
                  onSelect={handleSelect}
                  provider={provider}
                />
              ))
            ) : (
              <p className="text-center text-neutral-400 text-sm w-full">
                No streaming services found matching your search
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
