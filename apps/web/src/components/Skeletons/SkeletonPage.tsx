import SkeletonPageScroll from './SkeletonPageScroll';

export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SkeletonPageScroll />
      <main className="grow scroll-mt-[6rem] pb-20 pt-[6rem] transition-colors duration-500 md:scroll-mt-[8rem] md:pt-[8rem]">
        {children}
      </main>
    </>
  );
}
