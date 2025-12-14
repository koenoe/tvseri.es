import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { PageSkeleton } from '@/components/skeletons';
import * as auth from '@/lib/auth';

function RootComponent() {
  return (
    <>
      <Outlet />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
          theme: 'dark',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/unauthorized') {
      return;
    }

    const user = await auth.init();

    if (!user) {
      const loginUrl = await auth.getLoginUrl();
      throw redirect({ href: loginUrl });
    }

    if (user.role !== 'admin') {
      throw redirect({ to: '/unauthorized' });
    }

    return { user };
  },
  component: RootComponent,
  pendingComponent: PageSkeleton,
});
