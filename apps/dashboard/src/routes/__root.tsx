import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Loader2 } from 'lucide-react';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import * as auth from '@/lib/auth';

function Preloader() {
  return (
    <div className="flex min-h-svh w-full bg-sidebar">
      <main className="relative flex w-full flex-1 flex-col items-center justify-center bg-card text-card-foreground lg:m-2.5 lg:rounded-xl lg:shadow-sm">
        <Loader2 className="size-8 animate-spin text-white" />
        <p className="mt-4 text-sm text-white">Authenticating</p>
      </main>
    </div>
  );
}
Preloader.displayName = 'Preloader';

function RootComponent() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="mx-auto flex w-full max-w-(--content-max-width) flex-1 flex-col px-(--content-padding) py-6">
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
  pendingComponent: Preloader,
});
