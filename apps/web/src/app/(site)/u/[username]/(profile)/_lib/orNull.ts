import 'server-only';

import { ApiError } from '@/lib/api/client';

/** A read that may fail without failing its block (a nicety, like a pick): an API error becomes null */
export async function orNull<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
}
