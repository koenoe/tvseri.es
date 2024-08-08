import { gapStyleOverride } from '@/components/List/GenresList';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonPage from '@/components/Skeletons/SkeletonPage';
import SkeletonSpotlight from '@/components/Skeletons/SkeletonSpotlight';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonSpotlight className="mb-10 md:mb-20" />
      <SkeletonList className="mb-10 md:mb-16" />
      <SkeletonList className="mb-10 md:mb-16" />
      <SkeletonList
        className="mb-10 md:mb-16"
        variant="genre"
        style={gapStyleOverride}
        numberOfItems={5}
      />
      <SkeletonList className="mb-10 md:mb-16" />
      <SkeletonList className="mb-10 md:mb-16" />
      <SkeletonList />
    </SkeletonPage>
  );
}
