import 'server-only';

import type { LibraryIds } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { orNull } from '../_lib/orNull';
import { type Profile, withToken } from './profile';

/**
 * The VIEWER's own show ids (`GET /me/library-ids`, one call per render):
 * "New to you" tags and relation pills on someone else's profile. Null when
 * it fails: the tags are a nicety, never a reason to fail a block.
 */
export const loadViewerLibrary = (
  profile: Profile,
): Promise<LibraryIds | null> =>
  orNull(apiFetch<LibraryIds>('/me/library-ids', withToken(profile)));
