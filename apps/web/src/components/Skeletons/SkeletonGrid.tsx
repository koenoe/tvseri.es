import Grid from '../Grid/Grid';
import SkeletonPoster from './SkeletonPoster';

export default function SkeletonGrid({
  numberOfItems = 18,
}: Readonly<{ numberOfItems?: number }>) {
  return (
    <Grid>
      {[...Array(numberOfItems)].map((_, index) => (
        <SkeletonPoster key={index} />
      ))}
    </Grid>
  );
}
