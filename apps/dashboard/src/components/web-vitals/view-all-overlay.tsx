import { Maximize2 } from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';

type ViewAllOverlayProps = Readonly<{
  onClick?: () => void;
}>;

function ViewAllOverlayComponent({ onClick }: ViewAllOverlayProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-linear-to-t from-card to-transparent">
      <Button
        className="mb-3 cursor-pointer gap-1.5 rounded-full bg-black! px-4 py-3 text-xs"
        onClick={onClick}
        size="sm"
        variant="outline"
      >
        View All
        <Maximize2 className="size-2.5" />
      </Button>
    </div>
  );
}

ViewAllOverlayComponent.displayName = 'ViewAllOverlay';
export const ViewAllOverlay = memo(ViewAllOverlayComponent);
