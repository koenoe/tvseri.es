'use client';

export default function BackgroundGlobalBase({
  color,
}: Readonly<{
  color: string;
}>) {
  return (
    <style global jsx>{`
      main,
      main + footer {
        background-color: ${color};
      }
    `}</style>
  );
}
