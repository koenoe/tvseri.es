import { useMatches } from '@tanstack/react-router';
import { memo } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

function SiteHeaderComponent() {
  const matches = useMatches();
  const currentMatch = matches.at(-1);
  const title = currentMatch?.staticData?.title ?? 'Dashboard';
  const HeaderContent = currentMatch?.staticData?.headerContent;

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
        {HeaderContent && <HeaderContent />}
      </div>
    </header>
  );
}

SiteHeaderComponent.displayName = 'SiteHeader';

export const SiteHeader = memo(SiteHeaderComponent);
