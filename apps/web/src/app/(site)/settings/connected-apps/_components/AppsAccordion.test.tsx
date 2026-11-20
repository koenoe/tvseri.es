import { text } from 'node:stream/consumers';
import { prerenderToNodeStream } from 'react-dom/static';
import { describe, expect, it } from 'vitest';
import type { AppBrand } from '../../_lib/services';
import { AppBody, AppsAccordion, AppToggle } from './AppsAccordion';

/** The page as the server streams it: every hole read, nothing hydrated */
async function serverHtml(needsYou: AppBrand | '') {
  const { prelude } = await prerenderToNodeStream(
    <AppsAccordion needsYou={Promise.resolve(needsYou)}>
      <AppToggle app="bbc" name="BBC iPlayer" />
      <AppBody app="bbc">
        <p>body</p>
      </AppBody>
    </AppsAccordion>,
  );
  return text(prelude);
}

describe('the card that needs the viewer', () => {
  it('arrives shut, as its header-only placeholder, then plays its fold open', async () => {
    const html = await serverHtml('bbc');
    // open in name, so the fold plays to it once hydrated
    expect(html).toContain('aria-expanded="true"');
    expect(html).toMatch(/height:0(px)?;opacity:0;visibility:hidden/);
  });

  it('draws every other card shut', async () => {
    const html = await serverHtml('');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/height:0(px)?;opacity:0;visibility:hidden/);
  });
});
