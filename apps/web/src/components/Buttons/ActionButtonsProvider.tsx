'use client';

import {
  createContext,
  memo,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import { actionError, getActionErrorMessage } from '@/app/actionResult';
import { type ListType, setInList } from '@/app/watchActions';

type State = Readonly<{
  isFavorited: boolean;
  isWatchlisted: boolean;
}>;

type ContextValue = Readonly<{
  isPending: boolean;
  state: State;
  toggle: (listType: ListType) => void;
}>;

const stateKeys = {
  favorites: 'isFavorited',
  watchlist: 'isWatchlisted',
} as const;

const ActionButtonsContext = createContext<ContextValue | null>(null);

function ActionButtonsProvider({
  children,
  isFavorited,
  isWatchlisted,
  tvSeriesId,
}: PropsWithChildren<State & Readonly<{ tvSeriesId: number }>>) {
  const [state, setState] = useState<State>({ isFavorited, isWatchlisted });
  const [optimisticState, setOptimisticState] = useOptimistic(state);
  const [isPending, startTransition] = useTransition();

  // The optimistic value reverts on its own when the action fails; the
  // committed state only changes once the server confirms.
  const toggle = useCallback(
    (listType: ListType) => {
      const key = stateKeys[listType];
      const nextState = { ...optimisticState, [key]: !optimisticState[key] };

      startTransition(async () => {
        setOptimisticState(nextState);

        const result = await setInList(
          tvSeriesId,
          listType,
          nextState[key],
        ).catch(() => actionError('failed'));

        if (!result.ok) {
          toast.error(getActionErrorMessage(result.error));
          return;
        }

        startTransition(() => {
          setState((prevState) => ({ ...prevState, [key]: nextState[key] }));
        });
      });
    },
    [optimisticState, setOptimisticState, tvSeriesId],
  );

  const value = useMemo(
    () => ({ isPending, state: optimisticState, toggle }),
    [isPending, optimisticState, toggle],
  );

  return (
    <ActionButtonsContext.Provider value={value}>
      {children}
    </ActionButtonsContext.Provider>
  );
}

export function useActionButtons() {
  const context = useContext(ActionButtonsContext);

  if (!context) {
    throw new Error(
      `useActionButtons must be used within <ActionButtonsProvider />`,
    );
  }

  return context;
}

ActionButtonsProvider.displayName = 'ActionButtonsProvider';

export default memo(ActionButtonsProvider);
