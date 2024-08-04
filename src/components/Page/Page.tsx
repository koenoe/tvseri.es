import { PageStoreProvider } from './PageProvider';
import Background, { type BackgroundContext } from '../Background/Background';
import { type BackgroundVariant } from '../Background/Background';
import BackgroundGlobal from '../Background/BackgroundGlobal';

export default function Page({
  backgroundColor = '#000',
  backgroundImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  backgroundVariant = 'static',
  backgroundContext = 'page',
  children,
}: Readonly<{
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundVariant?: BackgroundVariant;
  backgroundContext?: BackgroundContext;
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
        style={{ backgroundColor }}
      >
        <Background
          variant={backgroundVariant}
          context={backgroundContext}
          color={backgroundColor}
          image={backgroundImage}
        />
        <div className="relative z-10">{children}</div>
      </main>
    </PageStoreProvider>
  );
}
