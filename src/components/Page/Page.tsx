import Background from '../Background/Background';
import { PageStoreProvider } from './PageProvider';

export default function Page({
  backgroundColor = '#000',
  backgroundImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  children,
}: Readonly<{
  backgroundColor?: string;
  backgroundImage?: string;
  children: React.ReactNode;
}>) {
  return (
    <PageStoreProvider
      backgroundColor={backgroundColor}
      backgroundImage={backgroundImage}
    >
      <main
        // pt-[8rem] is the height of the header
        className="min-h-screen py-[8rem] subpixel-antialiased transition-colors duration-500"
        style={{ backgroundColor }}
      >
        <Background />
        {children}
      </main>
    </PageStoreProvider>
  );
}
