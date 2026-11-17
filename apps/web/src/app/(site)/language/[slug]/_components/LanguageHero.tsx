import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { languageGlyph, variantTGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { languageName } from '../../../_discover/data/languageName';
import {
  LandingCrumb,
  LandingShowCount,
  LandingShowCountSkeleton,
  LandingTitle,
  PlainHeadingSkeleton,
  PlainHeroFrame,
} from '../../../_discover/landing';
import { htmlLang, scriptTabs } from '../_data/language';
import ScriptSwitch from './ScriptSwitch';

const TITLE_ID = 'language-title';

const crumb = <LandingCrumb href="/language" label="Languages" />;

/**
 * The hero without the shared hero's tile: the crumb, then the title, meta line and script switch
 * (`children`).
 */
export function LanguageHeroFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <PlainHeroFrame crumb={crumb} labelledBy={TITLE_ID}>
      {children}
    </PlainHeroFrame>
  );
}

/** The title, meta line and switch's place while the slug resolves */
export function LanguageHeadingSkeleton() {
  return (
    <PlainHeadingSkeleton id={TITLE_ID}>
      <span
        aria-hidden
        className="mt-12 block h-9.5 w-60 rounded-full bg-white/5 md:mt-6"
      />
    </PlainHeadingSkeleton>
  );
}

/**
 * "日本語": the page name in its own script, the meta line (the English
 * name, the language's shows and, on desktop, "Titles as they were
 * written"), and the switch that changes every title on the wall. Only the
 * count needs the API (streamed in); the rest is the cached shell.
 */
export async function LanguageHeading({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const language = languageName(slug);
  if (!language) {
    notFound();
  }
  const tabs = scriptTabs(language);
  const countSkeleton = <LandingShowCountSkeleton />;
  return (
    <>
      <LandingTitle id={TITLE_ID} name={language.native}>
        <span lang={htmlLang(slug)}>{language.native}</span>
      </LandingTitle>
      <MetaRow className="mt-2">
        <MetaItem icon={languageGlyph}>{language.english}</MetaItem>
        <Suspense fallback={countSkeleton}>
          <LandingShowCount slug={slug} type="language" />
        </Suspense>
        <MetaItem className="max-md:hidden" icon={variantTGlyph}>
          Titles as they were written
        </MetaItem>
      </MetaRow>
      {tabs.length > 0 ? <ScriptSwitch tabs={tabs} /> : null}
    </>
  );
}
