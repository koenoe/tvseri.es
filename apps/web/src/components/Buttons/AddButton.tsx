'use client';

import { cva } from 'class-variance-authority';

import { CheckSharpIcon } from '@/components/Icons/CheckSharpIcon';
import { PlusSharpIcon } from '@/components/Icons/PlusSharpIcon';
import CircleButton, { type ButtonVariantProps } from './CircleButton';

const svgStyles = cva('', {
  defaultVariants: {
    size: 'medium',
  },
  variants: {
    size: {
      medium: ['size-5 md:size-6'],
      small: ['size-3 md:size-4'],
    },
  },
});

export default function AddButton({
  isActive,
  isDisabled,
  onClick,
  title,
  size,
}: ButtonVariantProps &
  Readonly<{
    isActive?: boolean;
    isDisabled?: boolean;
    onClick?: (
      value: boolean,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
    title?: string;
  }>) {
  const iconClassName = svgStyles({ size });

  return (
    <CircleButton
      isActive={isActive}
      isDisabled={isDisabled}
      onClick={onClick}
      size={size}
      title={title}
    >
      {isActive ? (
        <CheckSharpIcon className={iconClassName} />
      ) : (
        <PlusSharpIcon className={iconClassName} />
      )}
    </CircleButton>
  );
}
