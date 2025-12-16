import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { PageSkeleton } from '@/components/skeletons';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import * as auth from '@/lib/auth';

function RootComponent() {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          '--header-height': 'calc(var(--spacing) * 12 + 1px)',
          '--sidebar-width': 'calc(var(--spacing) * 72)',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col max-w-7xl mx-auto w-full py-6 px-6">
          <Outlet />
        </div>
      </SidebarInset>
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
    </SidebarProvider>
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
