import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type RouteConfig = Readonly<{
  hasDeviceFilter: boolean;
  title: string;
}>;

const ROUTE_CONFIG: Readonly<Record<string, RouteConfig>> = {
  '/api': {
    hasDeviceFilter: false,
    title: 'API',
  },
  '/aws/cdn': {
    hasDeviceFilter: false,
    title: 'CDN',
  },
  '/aws/lambda': {
    hasDeviceFilter: false,
    title: 'Lambda',
  },
  '/web': {
    hasDeviceFilter: true,
    title: 'Web Vitals',
  },
};

function getRouteConfig(pathname: string): RouteConfig {
  for (const [route, config] of Object.entries(ROUTE_CONFIG)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }
  return { hasDeviceFilter: false, title: 'Dashboard' };
}

function SiteHeaderComponent() {
  const router = useRouterState();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { device?: string };
  const { hasDeviceFilter, title } = getRouteConfig(router.location.pathname);
  const device = search.device || 'desktop';

  const handleDeviceChange = (value: string) => {
    if (value === 'desktop' || value === 'mobile') {
      navigate({
        search: { device: value },
        to: '.',
      });
    }
  };

  return (
    <header className="relative flex h-(--header-height) shrink-0 items-center border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      {/* Sidebar trigger - positioned absolutely to not affect content centering */}
      <div className="2xl:absolute 2xl:pl-0 2xl:left-4 2xl:top-1/2 flex 2xl:-translate-y-1/2 items-center gap-2 h-full pl-4">
        <SidebarTrigger className="h-4" />
        <Separator
          className="data-[orientation=vertical]:h-4 self-center!"
          orientation="vertical"
        />
      </div>
      {/* Content - same padding as page content for alignment */}
      <div className="flex w-full flex-1 items-center max-w-7xl mx-auto px-6">
        <h1 className="text-base font-medium">{title}</h1>
        {hasDeviceFilter && (
          <ToggleGroup
            className="w-fit gap-0.5 rounded-full border border-border p-0.5 ml-auto"
            onValueChange={handleDeviceChange}
            type="single"
            value={device}
          >
            <ToggleGroupItem
              className="h-6 rounded-full px-3 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
              value="desktop"
            >
              Desktop
            </ToggleGroupItem>
            <ToggleGroupItem
              className="h-6 rounded-full px-3 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
              value="mobile"
            >
              Mobile
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    </header>
  );
}

SiteHeaderComponent.displayName = 'SiteHeader';

export { SiteHeaderComponent as SiteHeader };
