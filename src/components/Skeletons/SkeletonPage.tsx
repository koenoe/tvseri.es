export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main
      // pt-[] is the height of the header
      className="grow pb-20 pt-[6rem] subpixel-antialiased md:pt-[8rem]"
    >
      {children}
    </main>
  );
}
