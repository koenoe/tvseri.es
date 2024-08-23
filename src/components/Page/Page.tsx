import { cva } from 'class-variance-authority';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';

import { PageStoreProvider } from './PageProvider';
import Background, { type BackgroundContext } from '../Background/Background';
import { type BackgroundVariant } from '../Background/Background';
import BackgroundGlobal from '../Background/BackgroundGlobal';

export type Props = Readonly<{
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundVariant?: BackgroundVariant;
  backgroundContext?: BackgroundContext;
  children: React.ReactNode;
}>;

const dotsAndGridStyles = cva(
  [
    'pointer-events-none',
    'absolute',
    'bottom-0',
    'left-0',
    'right-0',
    'top-[-8rem]',
    'h-screen',
    'w-screen',
    '[mask-image:radial-gradient(circle,black,transparent_65%)]',
  ],
  {
    variants: {
      context: {
        dots: ['bg-dot-white/[0.2]'],
        grid: ['bg-grid-white/[0.2]'],
      },
    },
    defaultVariants: {
      context: 'dots',
    },
  },
);

export default function Page({
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  backgroundImage = DEFAULT_BACKGROUND_IMAGE,
  backgroundVariant = 'static',
  backgroundContext = 'page',
  children,
}: Props) {
  const content = (
    <>
      <BackgroundGlobal variant={backgroundVariant} color={backgroundColor} />
      <main
        // pt-[] is the height of the header
        className="grow pb-20 pt-[6rem] transition-colors duration-500 md:pt-[8rem]"
      >
        {backgroundContext === 'dots' || backgroundContext === 'grid' ? (
          <div className={dotsAndGridStyles({ context: backgroundContext })} />
        ) : (
          <Background
            variant={backgroundVariant}
            context={backgroundContext}
            color={backgroundColor}
            image={backgroundImage}
          />
        )}
        <div className="relative z-10">{children}</div>
      </main>
    </>
  );

  if (backgroundVariant === 'static') {
    return content;
  }

  return (
    <PageStoreProvider
      backgroundColor={backgroundColor}
      backgroundImage={backgroundImage}
    >
      {content}
    </PageStoreProvider>
  );
}
