import SkeletonCard from '@/components/Follow/SkeletonCard';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1 bg-neutral-900">
        <SkeletonCard />
      </div>
      <div className="flex-1 bg-neutral-900">
        <SkeletonCard />
      </div>
    </div>
  );
}
