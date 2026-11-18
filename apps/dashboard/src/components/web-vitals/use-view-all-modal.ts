import { useCallback, useState } from 'react';

import type { GroupedMetricData } from '@/lib/api/utils';
import type { RatingStatus } from '@/lib/web-vitals';

export function useViewAllModal() {
  const [modalState, setModalState] = useState<{
    data: GroupedMetricData;
    initialFilter?: RatingStatus;
    metricName: string;
    open: boolean;
    title: string;
    variant: 'country' | 'route';
  }>({
    data: { great: [], needsImprovement: [], poor: [] },
    metricName: '',
    open: false,
    title: '',
    variant: 'route',
  });

  const openModal = useCallback(
    (
      data: GroupedMetricData,
      title: string,
      metricName: string,
      variant: 'country' | 'route' = 'route',
      initialFilter?: RatingStatus,
    ) => {
      setModalState({
        data,
        initialFilter,
        metricName,
        open: true,
        title,
        variant,
      });
    },
    [],
  );

  const setOpen = useCallback((open: boolean) => {
    setModalState((prev) => ({ ...prev, open }));
  }, []);

  return {
    modalState,
    openModal,
    setOpen,
  };
}
