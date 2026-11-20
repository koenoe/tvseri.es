type KeyPress = Readonly<{
  key: string;
  preventDefault: () => void;
  repeat: boolean;
}>;

/**
 * For a button whose press moves focus to the next one of its kind (Keep
 * on the next paused row, Undo after Skip): a held Enter repeats its
 * keydown, and each repeat would press the button focus just reached. Only
 * the first press counts; Space already presses once, on its release.
 *
 * @example
 * <Button onClick={keep} onKeyDown={ignoreKeyRepeat}>Keep</Button>
 */
export function ignoreKeyRepeat(event: KeyPress): void {
  if (event.repeat && event.key === 'Enter') {
    event.preventDefault();
  }
}
