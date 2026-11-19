import type { ReactNode } from 'react';

export const STEP_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4';

/** A list item, so the steps read as one numbered list */
export default function InstallStep({
  action,
  children,
  number,
  picture,
  title,
}: Readonly<{
  action?: ReactNode;
  children: ReactNode;
  number: number;
  picture: ReactNode;
  title: string;
}>) {
  return (
    <li className="flex min-w-0 flex-col gap-3.5 rounded-[20px] bg-white/3.5 px-4 pt-4 pb-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]">
      <h3 className="flex items-center gap-3 text-title-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-[#171717] text-[15px] leading-5"
        >
          {number}
        </span>
        {title}
      </h3>
      {picture}
      <p className="text-body-sm text-white/80 leading-5.5">{children}</p>
      {action}
    </li>
  );
}
