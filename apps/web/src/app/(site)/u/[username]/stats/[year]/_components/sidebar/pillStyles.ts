import cn from '@/lib/cn';

/** `.st-ypill`: the phone's year pill, ringed; the page's year is filled white */
export const pillStyles = (selected = false) =>
  cn(
    'inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-medium text-body-sm',
    selected
      ? 'bg-white text-[#171717]'
      : 'text-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]',
  );
