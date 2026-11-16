import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { ErrorState } from '@/components/error-state';
import { AuthUnavailableError, SessionEndedError } from '@/lib/auth-session';

import { routeTree } from './routeTree.gen';

import './styles.css';

function isAuthError(error: Error): boolean {
  return (
    error instanceof AuthUnavailableError || error instanceof SessionEndedError
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Auth failures show the router's error state (with "Try again");
      // other query errors stay with the page as before.
      throwOnError: isAuthError,
    },
  },
});

const router = createRouter({
  defaultErrorComponent: ErrorState,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultStructuralSharing: true,
  routeTree,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
