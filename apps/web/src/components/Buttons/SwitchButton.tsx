'use client';

// Note: heavily inspired by https://www.aceternity.com/components/framer-motion-switch

import { motion } from 'motion/react';
import { memo, useId } from 'react';
import { twMerge } from 'tailwind-merge';

const SwitchButton = ({
  className,
  isChecked,
  onChange,
}: {
  className?: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}) => {
  const id = useId();

  return (
    <form
      className={twMerge('flex space-x-4 antialiased items-center', className)}
    >
      <label
        className={twMerge(
          'h-7 px-1 flex items-center border border-transparent shadow-[inset_0px_0px_12px_rgba(0,0,0,0.25)] rounded-full w-[60px] relative cursor-pointer transition duration-200',
          isChecked ? 'bg-neutral-500' : 'bg-neutral-700 border-neutral-500',
        )}
        htmlFor={`checkbox-${id}`}
      >
        <motion.div
          animate={{
            height: ['20px', '10px', '20px'],
            width: ['20px', '30px', '20px', '20px'],
            x: isChecked ? 32 : 0,
          }}
          className={twMerge(
            'h-[20px] block rounded-full bg-white shadow-md z-10',
          )}
          initial={{
            width: '20px',
            x: isChecked ? 0 : 32,
          }}
          key={String(isChecked)}
          transition={{
            duration: 0.3,
          }}
        />
        <input
          checked={isChecked}
          className="hidden"
          id={`checkbox-${id}`}
          onChange={(e) => onChange(e.target.checked)}
          type="checkbox"
        />
      </label>
    </form>
  );
};

export default memo(SwitchButton);
