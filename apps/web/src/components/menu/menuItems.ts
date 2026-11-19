import profilePath from '@/lib/routing/profilePath';
import statsPath from '@/lib/routing/statsPath';

type MenuId =
  | 'calendar'
  | 'discover'
  | 'history'
  | 'home'
  | 'library'
  | 'overview'
  | 'settings'
  | 'signIn'
  | 'signOut'
  | 'stats';

type Common = Readonly<{
  /** `aria-current="page"`: the rule and the step */
  current: boolean;
  id: MenuId;
  label: string;
}>;

/**
 * One word in the menu: a page (`link`), Sign in (the auth route) or
 * Sign out (a form post). No icons.
 */
export type MenuItem = Common &
  (
    | Readonly<{ href: string; kind: 'link' }>
    | Readonly<{ kind: 'signIn' | 'signOut' }>
  );

/**
 * The menu's groups: Watch, then signed in You · @handle
 * and the account line, signed out Sign in.
 */
export type MenuModel = Readonly<{
  /** Signed in: Settings, Sign out */
  account: ReadonlyArray<MenuItem>;
  /** Signed out */
  signIn: MenuItem | null;
  watch: ReadonlyArray<MenuItem>;
  you: Readonly<{ handle: string; items: ReadonlyArray<MenuItem> }> | null;
}>;

/** `path` is `base` or a page under it */
const within = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);

/**
 * The viewer's own profile page the path is on: '' (the overview),
 * `calendar`, `library`, `history`, `stats`, … or null when it is not their profile.
 */
function ownProfileSegment(pathname: string, handle: string): string | null {
  const match = /^\/u\/([^/]+)\/?(?:([^/]+).*)?$/.exec(pathname);
  if (!match?.[1]) {
    return null;
  }
  let name: string;
  try {
    name = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return name.toLowerCase() === handle.toLowerCase() ? (match[2] ?? '') : null;
}

/**
 * The menu for a viewer (`handle` from the display cookie, cosmetic) on
 * `pathname`, read when the menu opens: no
 * `usePathname`, so the header stays in the static shell. Profile pages mark
 * by prefix (`/u/{handle}/library/…` marks Library); Circle is not in the
 * menu. `year` is the Stats link's (the profile tab's: the current UTC year).
 */
export function menuModel({
  handle,
  pathname,
  year,
}: Readonly<{
  handle: string | null;
  pathname: string;
  year: number;
}>): MenuModel {
  const watch: ReadonlyArray<MenuItem> = [
    {
      current: pathname === '/',
      href: '/',
      id: 'home',
      kind: 'link',
      label: 'Home',
    },
    {
      current: within(pathname, '/discover'),
      href: '/discover',
      id: 'discover',
      kind: 'link',
      label: 'Discover',
    },
  ];

  if (!handle) {
    return {
      account: [],
      signIn: {
        current: false,
        id: 'signIn',
        kind: 'signIn',
        label: 'Sign in',
      },
      watch,
      you: null,
    };
  }

  const segment = ownProfileSegment(pathname, handle);
  const page = (
    id: MenuId,
    label: string,
    pageSegment: string,
    href: string,
  ): MenuItem => ({
    current: segment === pageSegment,
    href,
    id,
    kind: 'link',
    label,
  });

  const account: MenuItem[] = [
    {
      current: within(pathname, '/settings'),
      href: '/settings',
      id: 'settings',
      kind: 'link',
      label: 'Settings',
    },
  ];
  account.push({
    current: false,
    id: 'signOut',
    kind: 'signOut',
    label: 'Sign out',
  });

  return {
    account,
    signIn: null,
    watch,
    you: {
      handle,
      items: [
        page('overview', 'Overview', '', profilePath(handle)),
        page(
          'calendar',
          'Calendar',
          'calendar',
          profilePath(handle, 'calendar'),
        ),
        page('library', 'Library', 'library', profilePath(handle, 'library')),
        page('history', 'History', 'history', profilePath(handle, 'history')),
        page('stats', 'Stats', 'stats', statsPath(handle, year)),
      ],
    },
  };
}
