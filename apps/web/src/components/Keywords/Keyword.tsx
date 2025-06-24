import { type Keyword } from '@tvseri.es/types';
import Link from 'next/link';

export default function Keyword({
  keyword,
}: Readonly<{
  keyword: Keyword;
}>) {
  return (
    <Link
      href={{
        pathname: '/discover',
        query: { with_keywords: keyword.id },
      }}
      prefetch={false}
      className="flex shrink-0 cursor-pointer items-center justify-center gap-1 text-nowrap rounded-3xl border border-white/5 bg-[rgba(255,255,255,0.035)] px-3 py-2 text-xs leading-none tracking-wide text-white hover:border-white/10"
    >
      {keyword.name}
    </Link>
  );
}
