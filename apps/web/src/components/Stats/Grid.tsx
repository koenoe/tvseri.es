import { type ReactNode } from 'react';

export default function Grid({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:gap-6 2xl:grid-cols-10 [&>*]:!h-full [&>*]:!w-full">
      {children}
    </div>
  );
}
