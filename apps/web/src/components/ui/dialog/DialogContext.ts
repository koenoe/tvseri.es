import { createContext, use } from 'react';

type DialogContextValue = Readonly<{
  /** Asks the owner to close (calls `onOpenChange(false)`). */
  close: () => void;
}>;

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const value = use(DialogContext);
  if (!value) {
    throw new Error('Dialog parts must be rendered inside a dialog');
  }
  return value;
}
