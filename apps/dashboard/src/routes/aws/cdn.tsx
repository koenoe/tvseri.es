import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/aws/cdn')({
  component: CdnMetrics,
  staticData: {
    title: 'CDN',
  },
});

function CdnMetrics() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <h2 className="text-3xl">CDN Metrics</h2>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
