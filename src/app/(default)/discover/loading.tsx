import Grid from '@/components/Grid/Grid';
import SkeletonPoster from '@/components/Skeletons/SkeletonPoster';

export default function Loading() {
  return (
    <Grid>
      {[...Array(18)].map((_, index) => (
        <SkeletonPoster key={index} />
      ))}
    </Grid>
  );
}
