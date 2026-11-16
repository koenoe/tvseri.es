/** @jsxImportSource hono/jsx */
import { HomeIcon, RefreshIcon } from './icons';
import { Layout } from './layout';
import { htmlPage } from './page';

/**
 * The lost-state page: the
 * sign-in this browser started can't be found (cookies gone, another
 * browser, older than a day, a provider URL opened directly). A 400, so
 * S04E00; the picture is a CSS test card, so nothing else loads.
 * The way forward starts a fresh login on the site.
 */
function LostStatePage({ site }: Readonly<{ site: string }>) {
  return (
    <Layout className="e-pg" kind="error" site={site} title="Sign-in expired">
      <div aria-hidden="true" class="e-bars">
        <i class="e-b1" />
        <i class="e-b2" />
        <i class="e-b3" />
      </div>
      <div class="e-scr" />
      <main class="e-main">
        <div class="e-kick">
          <span class="e-code">S04E00</span>
          <span class="t-overline e-ov">Sign-in expired</span>
        </div>
        <h1 class="t-title-1 t-gap-8">Start your sign-in again.</h1>
        <p class="t-body t-gap-12">
          A sign-in belongs to the browser that started it and lasts a day. We
          can’t find this one, so start a fresh one here. It takes a second.
        </p>
        <div class="e-acts">
          <a class="e-btn w" href={`${site}/api/auth/login`}>
            <RefreshIcon />
            <span>Sign in again</span>
          </a>
          <a class="e-btn" href={site}>
            <HomeIcon />
            <span>Home</span>
          </a>
        </div>
      </main>
    </Layout>
  );
}

export const lostStateResponse = (site: string) =>
  htmlPage(<LostStatePage site={site} />, 400);
