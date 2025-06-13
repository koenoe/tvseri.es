'use client';

import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

type State = Readonly<{
  isFavorited: boolean;
  isWatchlisted: boolean;
}>;

const ActionButtonsContext = createContext<
  [State, (action: State | ((prevState: State) => State)) => void] | null
>(null);

export const ActionButtonsProvider = ({
  children,
  isFavorited,
  isWatchlisted,
}: PropsWithChildren & State) => {
  const state = useState<State>({
    isFavorited,
    isWatchlisted,
  });

  return (
    <ActionButtonsContext.Provider value={state}>
      {children}
    </ActionButtonsContext.Provider>
  );
};

export const useActionButtons = () => {
  const context = useContext(ActionButtonsContext);

  if (!context) {
    throw new Error(
      `useActionButtons must be used within <ActionButtonsProvider />`,
    );
  }

  return context;
};

export default ActionButtonsProvider;
