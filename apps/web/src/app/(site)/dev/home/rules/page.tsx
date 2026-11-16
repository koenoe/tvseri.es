import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Page from '@/components/background/Page';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'How Home works',
};

/** The Home rules doc as text, when it is checked out (next dev only; production 404s) */
export default async function HomeRulesPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const text = await readFile(
    path.join(process.cwd(), '../../docs/redesign/HOME-RULES.md'),
    'utf8',
  ).catch(() => 'The Home rules doc is not in this checkout.');
  return (
    <Page backgroundColor="#212628">
      <div className="mx-auto flex w-full max-w-page flex-col gap-4 px-gutter pt-16 pb-16">
        <Link className="text-body-sm text-cyan underline" href="/dev/home">
          Back to every kind
        </Link>
        <pre className="font-sans text-body-sm whitespace-pre-wrap text-white/80">
          {text}
        </pre>
      </div>
    </Page>
  );
}
