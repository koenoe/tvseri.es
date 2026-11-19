import { type ReactNode, useCallback } from 'react';

import { CHIP } from './styles';

/** A 36px choice chip that hands its value back: a show, an episode. */
export default function OptionChip<T>({
  children,
  onPick,
  value,
}: Readonly<{
  children: ReactNode;
  onPick: (value: T) => void;
  value: T;
}>) {
  const pick = useCallback(() => onPick(value), [onPick, value]);
  return (
    <button className={CHIP} onClick={pick} type="button">
      {children}
    </button>
  );
}
