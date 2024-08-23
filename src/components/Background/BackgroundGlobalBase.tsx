'use client';

export default function BackgroundGlobalBase({
  color,
}: Readonly<{
  color: string;
}>) {
  return (
    <style global jsx>{`
      :root {
        --main-background-color: ${color};
      }
      main,
      main + footer {
        background-color: var(--main-background-color);
      }
    `}</style>
  );
}
