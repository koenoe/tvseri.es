import { memo } from 'react';

import { DateRangeSelect } from '@/components/date-range-select';

function ApiHeaderComponent() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <DateRangeSelect />
    </div>
  );
}

ApiHeaderComponent.displayName = 'ApiHeader';

export const ApiHeader = memo(ApiHeaderComponent);
