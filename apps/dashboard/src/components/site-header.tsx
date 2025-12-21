import { useMatches } from '@tanstack/react-router';
import { memo } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

function SiteHeaderComponent() {
  const matches = useMatches();
  const currentMatch = matches.at(-1);
  const title = currentMatch?.staticData?.title;
  const HeaderContent = currentMatch?.staticData?.headerContent;

  return (
    <header className="grid h-(--header-height) shrink-0 grid-cols-[1fr_minmax(0,var(--content-max-width))_1fr] items-center border-b">
      <div className="flex items-center gap-2 pl-4">
        <SidebarTrigger className="h-4" />
        <Separator
          className="self-center! data-[orientation=vertical]:h-4"
          orientation="vertical"
        />
      </div>
      <div className="flex items-center justify-between px-(--content-padding)">
        {title ? (
          <>
            <h1 className="truncate text-base font-medium">{title}</h1>
            {HeaderContent && <HeaderContent />}
          </>
        ) : HeaderContent ? (
          <HeaderContent />
        ) : (
          <h1 className="truncate text-base font-medium">Dashboard</h1>
        )}
      </div>
    </header>
  );
}

SiteHeaderComponent.displayName = 'SiteHeader';

export const SiteHeader = memo(SiteHeaderComponent);
