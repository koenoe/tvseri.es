import { Link, useRouterState } from '@tanstack/react-router';
import {
  BarChart3,
  Cloud,
  Globe,
  Layers,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { memo } from 'react';

import logo from '@/assets/logo.svg';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { logout } from '@/lib/auth';

type NavItem = Readonly<{
  icon: LucideIcon;
  title: string;
  url: string;
}>;

const NAV_MAIN: ReadonlyArray<NavItem> = [
  {
    icon: Globe,
    title: 'Web',
    url: '/web',
  },
  {
    icon: Layers,
    title: 'API',
    url: '/api',
  },
];

const NAV_AWS: ReadonlyArray<NavItem> = [
  {
    icon: Cloud,
    title: 'Lambda',
    url: '/aws/lambda',
  },
  {
    icon: BarChart3,
    title: 'CDN',
    url: '/aws/cdn',
  },
];

function AppSidebarComponent(props: React.ComponentProps<typeof Sidebar>) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-transparent active:bg-transparent data-active:bg-transparent"
            >
              <Link className="gap-3!" to="/">
                <img alt="" className="size-5 -mt-0.75" src={logo} />
                <span className="text-sm font-semibold uppercase tracking-widest">
                  tvseri.es
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <Link className="gap-3!" to={item.url}>
                      <item.icon className="size-4.5!" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>AWS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_AWS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <Link className="gap-3!" to={item.url}>
                      <item.icon className="size-4.5!" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="cursor-pointer"
              onClick={logout}
              size="sm"
              tooltip="Log out"
            >
              <LogOut className="size-4!" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

AppSidebarComponent.displayName = 'AppSidebar';

export const AppSidebar = memo(AppSidebarComponent);
