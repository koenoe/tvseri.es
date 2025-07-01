'use client';

import {
  createContext,
  memo,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';

type State = Readonly<{
  isFavorited: boolean;
  isWatchlisted: boolean;
}>;

const ActionButtonsContext = createContext<
  [State, (action: State | ((prevState: State) => State)) => void] | null
>(null);

function ActionButtonsProvider({
  children,
  isFavorited,
  isWatchlisted,
}: PropsWithChildren & State) {
  const state = useState<State>({
    isFavorited,
    isWatchlisted,
  });

  return (
    <ActionButtonsContext.Provider value={state}>
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

export default memo(ActionButtonsProvider);
