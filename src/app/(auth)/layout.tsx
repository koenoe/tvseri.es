import Logo from '@/components/Logo';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h1 className="mb-8">
          <Logo />
          <span className="sr-only">tvseri.es</span>
        </h1>
        {children}
      </div>
    </div>
  );
}
