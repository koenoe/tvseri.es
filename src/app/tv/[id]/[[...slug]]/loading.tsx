import SkeletonAvatars from '@/components/Skeletons/SkeletonAvatars';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonPage from '@/components/Skeletons/SkeletonPage';
import SkeletonRating from '@/components/Skeletons/SkeletonRating';

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="container animate-pulse">
        <div className="relative flex h-[calc(95vh-16rem)] items-end md:h-[calc(70vh-8rem)]">
          <div className="w-full xl:w-4/5 2xl:w-3/5">
            <div className="relative mb-6 h-28 w-full bg-white/5 md:h-40 md:w-3/5" />
            <div className="mb-6 h-6 w-4/5 bg-white/10" />
          </div>
        </div>
        <div className="mb-6 flex w-full flex-col gap-1 xl:w-4/5 2xl:w-3/5">
          <div className="h-7 w-11/12 bg-white/20" />
          <div className="h-7 w-full bg-white/20" />
          <div className="h-7 w-9/12 bg-white/20" />
        </div>
        <SkeletonRating className="mb-6" />
        <div className="flex flex-col gap-1">
          <div className="h-4 w-32 bg-white/10" />
          {/* <div className="h-4 w-36 bg-white/10" />
          <div className="h-4 w-48 bg-white/10" /> */}
        </div>
        <SkeletonAvatars className="my-10 lg:mb-7 lg:mt-14" />
      </div>
      <SkeletonList className="mb-10 md:mb-16" variant="episode" />
      <SkeletonList />
    </SkeletonPage>
  );
}
