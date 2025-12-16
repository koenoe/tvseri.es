import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/')({
  component: ApiMetrics,
  staticData: {
    title: 'API',
  },
});

function ApiMetrics() {
  return null;
}
