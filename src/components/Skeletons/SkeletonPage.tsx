export default function SkeletonPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main
      // pt-[8rem] is the height of the header
      className="min-h-screen pt-[8rem] subpixel-antialiased"
    >
      {children}
    </main>
  );
}
