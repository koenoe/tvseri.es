import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

import BackgroundGlobalBase from '../Background/BackgroundGlobalBase';
import SkeletonPageScroll from './SkeletonPageScroll';

/**
 * SkeletonPage renders during loading states (loading.tsx files).
 *
 * Key behaviors:
 * - Resets background to default color immediately (no animation)
 * - No transition classes on main element
 *
 * This ensures:
 * - Series A → B navigation: Skeleton shows default color, then page loads with series B's color
 * - Back navigation: Cache restores previous color instantly (handled by PageStore)
 */
export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <BackgroundGlobalBase color={DEFAULT_BACKGROUND_COLOR} />
      <SkeletonPageScroll />
      <main className="grow scroll-mt-[6rem] pb-20 pt-[6rem] md:scroll-mt-[8rem] md:pt-[8rem]">
        {children}
      </main>
    </>
  );
}
