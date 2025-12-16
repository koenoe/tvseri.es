import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/')({
  component: ApiMetrics,
  staticData: {
    title: 'API',
  },
});

function ApiMetrics() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <h2 className="text-3xl">API Metrics</h2>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
