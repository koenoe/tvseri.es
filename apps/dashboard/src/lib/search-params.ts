export const DAY_RANGES = [3, 7, 30] as const;

export type DaysValue = (typeof DAY_RANGES)[number];

export const DEFAULT_DAYS: DaysValue = 7;

export function parseDays(value: unknown): DaysValue | undefined {
  const days = Number(value);
  return DAY_RANGES.find((range) => range === days);
}

export type Device = 'desktop' | 'mobile';

export const DEFAULT_DEVICE: Device = 'desktop';

export function isDevice(value: unknown): value is Device {
  return value === 'desktop' || value === 'mobile';
}
