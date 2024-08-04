import { PageStoreProvider } from './PageProvider';
import Background, { type BackgroundVariant } from '../Background/Background';
import BackgroundGlobal from '../Background/BackgroundGlobal';

export default function Page({
  backgroundColor = '#000',
  backgroundImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  backgroundVariant = 'page',
  children,
}: Readonly<{
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundVariant?: BackgroundVariant;
  children: React.ReactNode;
}>) {
  return (
    <PageStoreProvider
      backgroundColor={backgroundColor}
      backgroundImage={backgroundImage}
    >
      <BackgroundGlobal />
      <main
        // pt-[] is the height of the header
        className="grow pb-20 pt-[6rem] subpixel-antialiased transition-colors duration-500 md:pt-[8rem]"
      >
        <Background variant={backgroundVariant} />
        <div className="relative z-10">{children}</div>
      </main>
    </PageStoreProvider>
  );
}
