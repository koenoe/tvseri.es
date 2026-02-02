import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

import BackgroundReset from '../Background/BackgroundReset';
import SkeletonPageScroll from './SkeletonPageScroll';

export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <BackgroundReset />
      <SkeletonPageScroll />
      <main
        className="grow scroll-mt-[6rem] pb-20 pt-[6rem] transition-colors duration-500 md:scroll-mt-[8rem] md:pt-[8rem]"
        style={{ backgroundColor: DEFAULT_BACKGROUND_COLOR }}
      >
        {children}
      </main>
    </>
  );
}
