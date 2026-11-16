import type { MouseEvent } from 'react';

import CircleButton from '@/components/ui/button/CircleButton';
import { eyeGlyph } from '@/components/ui/icon/glyphs';

type Props = Readonly<{
  className?: string;
  /** What the press does, said for assistive tech ("Mark Dexter S02E02 as watched") */
  label: string;
  /** The tooltip, where it says less than the label */
  title?: string;
  /**
   * A toggle's state (`aria-pressed`, the white ring and filled eye, the
   * burst when it turns on). Left out, the eye is a plain press.
   */
  pressed?: boolean;
  onPress: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Pointer over the eye or focus on it: the place gets the show ready */
  onIntent: () => void;
  /** A touch on the eye, where the place also gets ready then */
  onTouchIntent?: () => void;
}>;

/**
 * The 32px eye that marks an episode watched, on the profile's lanes. It
 * only draws: what a press does, whether it toggles, and how the show is
 * made ready come from the place (the profile's `ToggleEye`).
 *
 * @example
 * <EyeButton label={label} onIntent={warm} onPress={mark} />
 */
export default function EyeButton({
  className,
  label,
  onIntent,
  onPress,
  onTouchIntent,
  pressed,
  title,
}: Props) {
  // CircleButton's tooltip is its label unless the place names one
  const tooltip = title ?? label;
  return (
    <CircleButton
      className={className}
      icon={eyeGlyph}
      label={label}
      onClick={onPress}
      onFocus={onIntent}
      onPointerEnter={onIntent}
      onTouchStart={onTouchIntent}
      pressed={pressed}
      title={tooltip}
    />
  );
}
