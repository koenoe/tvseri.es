import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/aws/cdn')({
  component: CdnMetrics,
  staticData: {
    title: 'CDN',
  },
});

function CdnMetrics() {
  return null;
}
