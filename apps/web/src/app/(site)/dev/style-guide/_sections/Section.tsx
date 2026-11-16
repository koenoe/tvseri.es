import type { ReactNode } from 'react';

export default function Section({
  children,
  id,
  source,
  title,
}: Readonly<{
  children: ReactNode;
  id: string;
  /** what this section is checked against */
  source: string;
  title: string;
}>) {
  return (
    <section aria-labelledby={id} className="mt-16">
      <h2 className="text-title-2" id={id}>
        {title}
      </h2>
      <p className="mt-2 text-meta text-white/60">Check against {source}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
