'use client';

import { cva } from 'class-variance-authority';
import { useRouter } from 'next/navigation';
import { memo, useCallback } from 'react';

import { PencilIcon } from '@/components/Icons/PencilIcon';
import CircleButton, { type ButtonVariantProps } from './CircleButton';

const svgStyles = cva('', {
  defaultVariants: {
    size: 'medium',
  },
  variants: {
    size: {
      medium: ['size-3 md:size-4'],
      small: ['size-2 md:size-3'],
    },
  },
});

const EditProfileButton = ({ size }: ButtonVariantProps) => {
  const router = useRouter();
  const handleClick = useCallback(() => {
    router.push('/settings/profile');
  }, [router]);

  return (
    <CircleButton onClick={handleClick} size={size} title="Edit profile">
      <PencilIcon className={svgStyles({ size })} />
    </CircleButton>
  );
};

export default memo(EditProfileButton);
