const PROFILE_PATH = /^\/u\/([^/]+)(?:\/|$)/;

/** The profile owner when the 401 is on a `/u/{username}` page, else null. */
export default function profileFromPath(pathname: string): string | null {
  const segment = PROFILE_PATH.exec(pathname)?.[1];
  if (!segment) {
    return null;
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}
