import { useNavigate, useSearch } from '@tanstack/react-router';
import { memo } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function DeviceToggleComponent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { device?: string };
  const device = search.device || 'desktop';

  const handleDeviceChange = (value: string) => {
    if (value === 'desktop' || value === 'mobile') {
      navigate({
        search: (prev) => ({ ...prev, device: value }),
        to: '.',
      });
    }
  };

  return (
    <ToggleGroup
      className="w-fit gap-0.5 rounded-full border border-border p-0.5"
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
  );
}

DeviceToggleComponent.displayName = 'DeviceToggle';

export const DeviceToggle = memo(DeviceToggleComponent);
