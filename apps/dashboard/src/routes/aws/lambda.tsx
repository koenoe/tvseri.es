import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/aws/lambda')({
  component: LambdaMetrics,
  staticData: {
    title: 'Lambda',
  },
});

function LambdaMetrics() {
  return null;
}
