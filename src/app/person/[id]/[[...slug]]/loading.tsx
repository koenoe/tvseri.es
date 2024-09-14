import Grid from '@/components/Grid/Grid';
import SkeletonPage from '@/components/Skeletons/SkeletonPage';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="mb-10 mt-10 md:container md:mb-16 md:mt-20">
        <div className="grid max-w-screen-xl grid-cols-1 md:grid-cols-3 [&>*]:!h-auto [&>*]:!w-full">
          <div className="mb-10 px-[2rem] md:mb-0 md:px-0">
            <div className="relative h-auto w-full overflow-hidden rounded-lg pt-[150%] shadow-lg after:absolute after:inset-0 after:rounded-lg after:shadow-[inset_0_0_0_1px_rgba(221,238,255,0.08)] after:content-[''] md:mx-0">
              <div className="absolute inset-0 h-full w-full overflow-hidden rounded-lg bg-white/5">
                <div className="absolute inset-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="px-[2rem] md:pl-12 lg:pl-16">
              <div className="mb-4 mt-3 h-12 w-4/6 bg-white/30" />
              <div className="mb-4 h-4 w-3/5 bg-white/10" />
              <div className="mb-12 flex flex-col gap-1">
                <div className="h-6 w-10/12 bg-white/20" />
                <div className="h-6 w-full bg-white/20" />
                <div className="h-6 w-9/12 bg-white/20" />
                <div className="hidden h-6 w-11/12 bg-white/20 xl:block" />
                <div className="hidden h-6 w-7/12 bg-white/20 xl:block" />
              </div>
            </div>
            <div className="mx-[2rem] mb-2 mt-6 h-7 w-2/12 bg-white/20 md:ml-12 lg:ml-16" />
            <div className="relative flex w-full flex-nowrap gap-4 overflow-x-scroll px-[2rem] pb-6 pt-6 scrollbar-hide md:px-12 lg:gap-6 lg:px-16">
              {[...Array(3)].map((_, index) => (
                <SkeletonPoster key={index} size="small" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="mb-6 h-8 w-2/12 bg-white/20" />
        <Grid>
          {[...Array(18)].map((_, index) => (
            <SkeletonPoster key={index} />
          ))}
        </Grid>
      </div>
    </SkeletonPage>
  );
}
