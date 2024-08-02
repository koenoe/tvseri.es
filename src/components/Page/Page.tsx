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
        // py-[] is the height of the header
        className="min-h-screen py-[6rem] subpixel-antialiased transition-colors duration-500 md:py-[8rem]"
        style={{ backgroundColor }}
      >
        <Background />
        {children}
      </main>
    </PageStoreProvider>
  );
}
