import type { Metadata } from 'next';
import { Suspense } from 'react';
import { languageName } from '../../_discover/data/languageName';
import { NOT_FOUND_METADATA } from '../../_discover/landing/notFoundMetadata';
import LanguageLanding, {
  LanguageLandingShell,
} from './_components/LanguageLanding';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** One sample slug (Cache Components needs one); others render on demand */
export const generateStaticParams = () => [{ slug: 'ja' }];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const language = languageName(slug);
  return language
    ? {
        description: `Series in ${language.english}, with their titles as they were written: the most-rated to start with, then more.`,
        title: `${language.english} series`,
      }
    : NOT_FOUND_METADATA;
}

/**
 * `/language/{code}`: the language's name
 * in its own script with the script switch, Start here, the title wall and
 * the end card. The frame and crumb are the cached shell; the slug's parts
 * stream in from cached loaders.
 */
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<LanguageLandingShell />}>
      <LanguageLanding params={params} />
    </Suspense>
  );
}
