import { META_YEAR_CLASS_PREFIX } from './MetaDate';

// Runs before the first paint: hides the year suffix of meta dates in the
// viewer's current year. Cached and prerendered HTML stays valid (the server
// never reads the clock) and React never re-renders for it. An adopted
// stylesheet adds no DOM node for hydration to trip over; where it isn't
// supported, dates simply keep their year.
const scriptHtml = {
  __html: `(function(){try{var s=new CSSStyleSheet();s.replaceSync('.${META_YEAR_CLASS_PREFIX}'+new Date().getFullYear()+'{display:none}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,s];}catch(e){}})();`,
};

/**
 * A plain inline script for the root layout, which renders once per document
 * (so, like the scrollbar check next to it, it needs no client component).
 */
export default function MetaYearScript() {
  return (
    // Not next/script: in the App Router a beforeInteractive inline script only
    // runs once Next's async bootstrap loads, which can be after first paint.
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: a static pre-paint script
      dangerouslySetInnerHTML={scriptHtml}
    />
  );
}
