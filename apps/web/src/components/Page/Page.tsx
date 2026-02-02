import { cva } from 'class-variance-authority';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';
import Background, { type BackgroundContext } from '../Background/Background';
import { BackgroundProvider } from '../Background/BackgroundProvider';
import BackgroundStyle from '../Background/BackgroundStyle';

export type Props = Readonly<{
  backgroundColor?: string;
  backgroundImage?: string;
  animateBackground?: boolean;
  backgroundContext?: BackgroundContext;
  backgroundPriority?: boolean;
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
  animateBackground = false,
  backgroundContext = 'page',
  backgroundPriority = false,
  children,
}: Props) {
  const backgroundElement =
    backgroundContext === 'dots' || backgroundContext === 'grid' ? (
      <div className={dotsAndGridStyles({ context: backgroundContext })} />
    ) : (
      <Background
        animated={animateBackground}
        color={backgroundColor}
        context={backgroundContext}
        image={backgroundImage}
        priority={backgroundPriority}
      />
    );

  const content = (
    <>
      <BackgroundStyle color={backgroundColor} />
      <main
        className="grow scroll-mt-[6rem] pb-10 pt-[6rem] md:scroll-mt-[8rem] md:pb-16 md:pt-[8rem]"
        style={{
          backgroundColor,
        }}
      >
        {backgroundElement}
        <div className="relative z-10">{children}</div>
      </main>
    </>
  );

  // Always wrap in BackgroundProvider - it handles SPA navigation color sync
  // for both static and dynamic pages
  return (
    <BackgroundProvider
      initialColor={backgroundColor}
      initialImage={backgroundImage}
    >
      {content}
    </BackgroundProvider>
  );
}
