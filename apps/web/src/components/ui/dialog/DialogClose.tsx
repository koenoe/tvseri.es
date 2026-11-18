'use client';

import { type ComponentProps, useCallback } from 'react';

import Button from '@/components/ui/button/Button';
import CircleButton from '@/components/ui/button/CircleButton';
import { closeGlyph } from '@/components/ui/icon/glyphs';

import { useDialog } from './DialogContext';

/**
 * A text button that closes the dialog it's in ("Cancel", "Not now"). Quiet
 * by default; any `Button` prop applies.
 *
 * @example
 * <DialogFooter><DialogClose>Cancel</DialogClose></DialogFooter>
 */
export function DialogClose({
  onClick,
  variant = 'quiet',
  ...rest
}: ComponentProps<typeof Button>) {
  const { close } = useDialog();
  const handleClick = useCallback<
    NonNullable<ComponentProps<'button'>['onClick']>
  >(
    (event) => {
      onClick?.(event);
      close();
    },
    [close, onClick],
  );
  return <Button onClick={handleClick} variant={variant} {...rest} />;
}

/** The ✕ in a dialog's header: 32px, or `size`. */
export function DialogCloseCircle({
  iconSize,
  size,
  tone,
}: Pick<ComponentProps<typeof CircleButton>, 'iconSize' | 'size' | 'tone'>) {
  const { close } = useDialog();
  return (
    <CircleButton
      icon={closeGlyph}
      iconSize={iconSize}
      label="Close"
      onClick={close}
      size={size}
      tone={tone}
    />
  );
}
