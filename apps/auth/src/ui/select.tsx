/** @jsxImportSource hono/jsx */
import { isAuthNotice } from '@tvseri.es/constants';

import { htmlPage } from './page';
import { NOTICE_COPY, StartPage } from './start';

/**
 * The issuer's `select` (its `/authorize` page with more than one
 * provider): the start page. `?notice=` on the authorize URL (the site adds
 * it when it restarts a login after Google) shows one allow-listed note;
 * any other value is ignored, so no text from the URL reaches the page.
 */
export function SelectUI({ site }: Readonly<{ site: string }>) {
  return async (
    providers: Record<string, string>,
    req: Request,
  ): Promise<Response> => {
    const notice = new URL(req.url).searchParams.get('notice');
    const known = isAuthNotice(notice) ? notice : undefined;
    const note = known ? NOTICE_COPY[known] : undefined;
    return htmlPage(
      <StartPage
        focus={known === 'google_unverified' ? 'email' : undefined}
        note={note}
        providers={providers}
        site={site}
      />,
    );
  };
}

/**
 * “Change” on the code page: the start page with the address put back in
 * the field, focused and selected (the script selects it), because the
 * usual reason is a typo. It comes from a post (`action=change`, handled in
 * `app.ts`), so the address never sits in a URL or an access log.
 */
export function changeAddressPage({
  email,
  providers,
  site,
}: Readonly<{
  email: string;
  providers: Readonly<Record<string, string>>;
  site: string;
}>): Response {
  return htmlPage(
    <StartPage email={email} focus="email" providers={providers} site={site} />,
  );
}
