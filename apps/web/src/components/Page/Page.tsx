import { cva } from 'class-variance-authority';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';
import Background, {
  type BackgroundContext,
  type BackgroundVariant,
} from '../Background/Background';
import BackgroundGlobal from '../Background/BackgroundGlobal';
import { PageStoreProvider } from './PageStoreProvider';

export type Props = Readonly<{
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundVariant?: BackgroundVariant;
  backgroundContext?: BackgroundContext;
  children: React.ReactNode;
  usePersistentStore?: boolean;
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
    defaultVariants: {
      context: 'dots',
    },
    variants: {
      context: {
        dots: ['bg-dot-white/[0.2]'],
        grid: ['bg-grid-white/[0.2]'],
      },
    },
  },
);

export default function Page({
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  backgroundImage = DEFAULT_BACKGROUND_IMAGE,
  backgroundVariant = 'static',
  backgroundContext = 'page',
  children,
  usePersistentStore,
}: Props) {
  const background = () => {
    if (backgroundContext === 'dots' || backgroundContext === 'grid') {
      return (
        <div className={dotsAndGridStyles({ context: backgroundContext })} />
      );
    }

    return (
      <Background
        color={backgroundColor}
        context={backgroundContext}
        image={backgroundImage}
        variant={backgroundVariant}
      />
    );
  };

  const content = () => {
    return (
      <>
        <BackgroundGlobal color={backgroundColor} variant={backgroundVariant} />
        <main
          className="grow scroll-mt-[6rem] pb-10 pt-[6rem] md:scroll-mt-[8rem] md:pb-16 md:pt-[8rem]"
          style={{
            backgroundColor,
          }}
        >
          {background()}
          <div className="relative z-10">{children}</div>
        </main>
      </>
    );
  };

  if (backgroundVariant === 'static') {
    return content();
  }

  return (
    <PageStoreProvider
      backgroundColor={backgroundColor}
      backgroundImage={backgroundImage}
      persistent={usePersistentStore}
    >
      {content()}
    </PageStoreProvider>
  );
}
