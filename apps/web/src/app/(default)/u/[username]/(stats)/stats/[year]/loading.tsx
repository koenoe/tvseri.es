import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';
import Grid from '@/components/Stats/Grid';
import SkeletonBlock from '@/components/Stats/SkeletonBlock';
import SkeletonSpotlight from '@/components/Stats/SkeletonSpotlight';
import SvgGlowAnimatePattern from '@/components/Stats/SvgGlowAnimatePattern';

export default function Loading() {
  return (
    <Page backgroundContext="dots">
      <div className="container relative h-[300px] md:h-[360px]">
        <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,black,transparent_30%,transparent_70%,black)] xl:[mask-image:linear-gradient(to_right,black,transparent_35%,transparent_65%,black)]">
          <SvgGlowAnimatePattern className="absolute left-[0.5rem] top-1/2 w-1/2 -translate-y-1/2 md:left-[2rem]" />
          <SvgGlowAnimatePattern className="absolute right-[0.5rem] top-1/2 w-1/2 -translate-y-1/2 scale-x-[-1] md:right-[2rem]" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="h-24 w-48 animate-pulse bg-white/10 sm:h-32 sm:w-64 md:h-40 md:w-80" />
          <div className="mt-4 flex items-center gap-2">
            <div className="h-5 w-36 animate-pulse bg-white/5 md:h-7 md:w-48" />
            <div className="h-6 w-16 animate-pulse rounded bg-white/10 md:h-7 md:w-20" />
          </div>
        </div>
      </div>
      <div className="container mt-10 md:mt-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <div className="relative mt-14 grid w-full grid-cols-1 gap-20 md:mt-20 xl:grid-cols-2 xl:gap-10">
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <div className="h-6 w-24 animate-pulse bg-white/10 lg:h-7 lg:w-28" />
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <SkeletonSpotlight />
          </div>
          <div>
            <div className="mb-6 flex items-center gap-x-6">
              <div className="h-6 w-24 animate-pulse bg-white/10 lg:h-7 lg:w-28" />
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <SkeletonSpotlight />
          </div>
        </div>
        <div className="mt-20 h-[200px] w-full md:h-auto">
          <div className="mb-6 flex items-center gap-x-6">
            <div className="h-6 w-20 animate-pulse bg-white/10 lg:h-7 lg:w-24" />
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <div className="h-[200px] w-full animate-pulse bg-white/5" />
        </div>
        <div className="mt-20 grid grid-cols-1 gap-20 xl:grid-cols-2 xl:gap-10">
          <div className="relative w-full">
            <div className="mb-6 flex items-center gap-x-6">
              <div className="h-6 w-16 animate-pulse bg-white/10 lg:h-7 lg:w-20" />
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <div className="relative h-[704px] w-full animate-pulse bg-white/5" />
          </div>
          <div className="relative h-full w-full">
            <div className="mb-6 flex items-center gap-x-6">
              <div className="h-6 w-36 animate-pulse bg-white/10 lg:h-7 lg:w-44" />
              <div className="h-[3px] flex-grow bg-white/10" />
            </div>
            <div className="relative h-[704px] w-full animate-pulse bg-white/5" />
          </div>
        </div>
        <div className="mt-20">
          <div className="mb-6 flex items-center gap-x-6">
            <div className="h-6 w-20 animate-pulse bg-white/10 lg:h-7 lg:w-24" />
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <Grid>
            {[...Array(30)].map((_, index) => (
              <SkeletonPoster key={index} />
            ))}
          </Grid>
        </div>
        <div className="relative mt-20 w-full">
          <div className="mb-8 flex items-center gap-x-6">
            <div className="h-6 w-24 animate-pulse bg-white/10 lg:h-7 lg:w-28" />
            <div className="h-[3px] flex-grow bg-white/10" />
          </div>
          <div className="relative aspect-[192/95] w-full animate-pulse bg-white/5" />
        </div>
      </div>
      <SkeletonList
        className="mt-20"
        scrollBarClassName="h-[3px] rounded-none"
        size="medium"
      />
    </Page>
  );
}
