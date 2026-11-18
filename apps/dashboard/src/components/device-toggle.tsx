import { useNavigate, useSearch } from '@tanstack/react-router';
import { memo, useCallback } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DEFAULT_DEVICE, isDevice } from '@/lib/search-params';

const ITEM_CLASSES =
  'h-6 rounded-full px-3 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground';

function DeviceToggleComponent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { device?: string };
  const device = search.device || DEFAULT_DEVICE;

  const handleDeviceChange = useCallback(
    (value: string) => {
      if (isDevice(value)) {
        navigate({
          search: (prev) => ({ ...prev, device: value }),
          to: '.',
        });
      }
    },
    [navigate],
  );

  return (
    <ToggleGroup
      className="w-fit gap-0.5 rounded-full border border-border p-0.5"
      onValueChange={handleDeviceChange}
      type="single"
      value={device}
    >
      <ToggleGroupItem className={ITEM_CLASSES} value="desktop">
        Desktop
      </ToggleGroupItem>
      <ToggleGroupItem className={ITEM_CLASSES} value="mobile">
        Mobile
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

DeviceToggleComponent.displayName = 'DeviceToggle';

export const DeviceToggle = memo(DeviceToggleComponent);
