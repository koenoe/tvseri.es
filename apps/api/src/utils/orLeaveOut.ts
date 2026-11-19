import { logWarn } from './logWarn';

/**
 * A part of a page that may fail without failing the page: its value, or
 * undefined (logged) so the caller leaves it out
 */
export const orLeaveOut = async <T>(
  label: string,
  run: () => Promise<T>,
): Promise<T | undefined> => {
  try {
    return await run();
  } catch (error) {
    logWarn(`${label} failed, leaving it out`, error);
    return undefined;
  }
};
