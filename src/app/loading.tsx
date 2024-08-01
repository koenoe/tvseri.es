import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonPage from '@/components/Skeletons/SkeletonPage';
import SkeletonSpotlight from '@/components/Skeletons/SkeletonSpotlight';

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonSpotlight className="mb-20" />
      <SkeletonList />
    </SkeletonPage>
  );
}
