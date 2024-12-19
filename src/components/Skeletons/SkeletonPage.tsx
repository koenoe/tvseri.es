export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="grow scroll-mt-[6rem] pb-20 pt-[6rem] md:scroll-mt-[8rem] md:pt-[8rem]">
      <div className="relative z-10">{children}</div>
    </main>
  );
}
