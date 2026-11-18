import Logo from '@/components/ui/Logo';

import Section from './Section';

const TOKENS = [
  ['display', 'font-display text-display', 'Breaking Bad'],
  ['title-1', 'text-title-1', 'Can’t decide? Let us pick'],
  ['title-2', 'text-title-2', 'Top Picks for November'],
  ['title-3', 'text-title-3', 'Where to watch'],
  [
    'body',
    'text-body text-white/80',
    'A chemistry teacher diagnosed with terminal lung cancer turns to manufacturing methamphetamine.',
  ],
  [
    'body-sm',
    'text-body-sm text-white/80',
    'Walt and Jesse try to find a new way to cook.',
  ],
  ['meta', 'text-meta text-white/60', '2008 · 5 seasons · Drama'],
  ['caption', 'text-caption text-white/60', 'Data from TMDB and JustWatch'],
  ['overline', 'text-overline text-white/60 uppercase', 'Next up · S03E05'],
  ['numeral', 'text-numeral tabular-nums', '1,284'],
  ['numeral-xl', 'text-numeral-xl tabular-nums', '2026'],
] as const;

export default function TypeSection() {
  return (
    <Section id="type" source="the type scale" title="Type">
      <dl className="grid gap-6">
        {TOKENS.map(([name, className, sample]) => (
          <div className="grid gap-1 md:grid-cols-[160px_1fr]" key={name}>
            <dt className="text-caption text-white/60">{name}</dt>
            <dd className={className}>{sample}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-12 flex flex-wrap items-center gap-12">
        <Logo size={24} />
        <Logo size={20} />
        <Logo size={18} />
      </div>
      <div className="mt-12 flex flex-wrap gap-6 text-body-sm">
        <span className="text-white">white</span>
        <span className="text-white/80">white/80</span>
        <span className="text-white/60">white/60</span>
        {/* contrast-exempt: the style guide shows the step */}
        <span className="text-white/40">white/40</span>
        <span className="text-cyan">cyan</span>
        <span className="text-pink">pink</span>
      </div>
    </Section>
  );
}
