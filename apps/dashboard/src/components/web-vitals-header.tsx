import { memo } from 'react';

import { DateRangeSelect } from '@/components/date-range-select';
import { DeviceToggle } from '@/components/device-toggle';

function WebVitalsHeaderComponent() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <DateRangeSelect />
      <DeviceToggle />
    </div>
  );
}

WebVitalsHeaderComponent.displayName = 'WebVitalsHeader';

export const WebVitalsHeader = memo(WebVitalsHeaderComponent);
