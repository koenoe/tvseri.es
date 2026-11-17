export const DAY_RANGES = [3, 7, 30] as const;

export type DaysValue = (typeof DAY_RANGES)[number];

export const DEFAULT_DAYS: DaysValue = 7;

export function parseDays(value: unknown): DaysValue | undefined {
  const days = Number(value);
  return DAY_RANGES.find((range) => range === days);
}

export const PAGE_SIZES = [10, 25, 50] as const;

export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

export type Device = 'desktop' | 'mobile';

export const DEFAULT_DEVICE: Device = 'desktop';

export function isDevice(value: unknown): value is Device {
  return value === 'desktop' || value === 'mobile';
}
