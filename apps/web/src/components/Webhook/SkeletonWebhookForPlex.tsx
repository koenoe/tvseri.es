import { plexStyles } from './WebhookForPlex';

export default function SkeletonWebhookForPlex() {
  return (
    <div
      className={plexStyles({
        className:
          'flex h-28 w-full items-center justify-center rounded-xl px-8 shadow-lg',
      })}
    >
      <div className="h-12 w-full animate-pulse rounded-lg bg-black/20" />
    </div>
  );
}
