import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
  staticData: {
    title: 'Unauthorized',
  },
});

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground mt-2">
          You don't have permission to access this dashboard.
        </p>
      </div>
    </div>
  );
}
