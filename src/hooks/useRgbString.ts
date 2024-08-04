import { useMemo } from 'react';

import hexToRgb from '@/utils/hexToRgb';

export default function useRgbString(hex: string) {
  return useMemo(() => {
    return hexToRgb(hex).join(',');
  }, [hex]);
}
