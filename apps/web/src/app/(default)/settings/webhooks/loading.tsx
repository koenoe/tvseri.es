import SkeletonWebhookForPlex from '@/components/Webhook/SkeletonWebhookForPlex';

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="relative w-full">
        <div className="mb-4 h-6 w-12 animate-pulse bg-white/10 lg:h-7" />
        <SkeletonWebhookForPlex />
      </div>
    </div>
  );
}
