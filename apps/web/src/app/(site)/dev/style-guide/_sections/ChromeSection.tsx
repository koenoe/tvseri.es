'use client';

import Link from 'next/link';
import { type MouseEvent, useCallback } from 'react';

import BackgroundDynamic from '@/components/background/BackgroundDynamic';
import {
  BackgroundProvider,
  useBackground,
} from '@/components/background/BackgroundProvider';
import BackgroundStyle from '@/components/background/BackgroundStyle';
import { DEFAULT_PAGE_COLOR } from '@/components/background/pageColor';
import { DEFAULT_BACKGROUND_IMAGE } from '@/components/background/store';
import Footer from '@/components/footer/Footer';
import HeaderFrame from '@/components/header/HeaderFrame';
import HeaderLogo from '@/components/header/HeaderLogo';
import { HeaderStoreProvider } from '@/components/header/HeaderStoreProvider';
import type { HeaderMode } from '@/components/header/headerMode';
import Menu from '@/components/menu/Menu';
import MotionProvider from '@/components/motion/MotionProvider';

import Section from './Section';

const TMDB = 'https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces';

const SLIDES = [
  {
    color: '#487c7c',
    image: `${TMDB}/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg`,
    label: 'Teal',
  },
  {
    color: '#081818',
    image: `${TMDB}/31o1Ufd7bStD5dGEcpzapOjwaqx.jpg`,
    label: 'Night',
  },
  {
    color: '#5a3a24',
    image: `${TMDB}/gPQppUnLx9vqPDLz3WwZ2HJsNbt.jpg`,
    label: 'Rust',
  },
  {
    color: DEFAULT_PAGE_COLOR,
    image: DEFAULT_BACKGROUND_IMAGE,
    label: 'Ground, no backdrop',
  },
] as const;

/** Each one must end up as the ground. */
const BAD_COLORS = ['red', '#fff;}body{display:none}', 'url(x.png)', '#fff'];

const BOX =
  'relative overflow-hidden rounded-12 bg-ground [transform:translateZ(0)]';

const behindStyle = {
  backgroundImage: `url(${TMDB.replace('w1920_and_h1080_multi_faces', 'w780')}/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg)`,
  backgroundPosition: 'center 30%',
  backgroundSize: 'cover',
};

const CHIP =
  'rounded-8 bg-white/10 px-3 py-1 text-body-sm font-medium hover:bg-white/20';

/** One header mode, frozen; the transform keeps the fixed pill in its box. */
function HeaderState({
  mode,
  note,
}: Readonly<{ mode: HeaderMode; note: string }>) {
  return (
    <figure>
      <div className={`${BOX} h-40`} style={behindStyle}>
        <HeaderStoreProvider initialMode={mode}>
          <HeaderFrame>
            <MotionProvider>
              <HeaderLogo />
              <Menu />
            </MotionProvider>
          </HeaderFrame>
        </HeaderStoreProvider>
      </div>
      <figcaption className="mt-2 text-caption text-white/60">
        <span className="font-semibold text-white">{mode}</span> · {note}
      </figcaption>
    </figure>
  );
}

function CurrentColor() {
  const color = useBackground((state) => state.backgroundColor);
  return (
    <p className="text-meta text-white/80">
      Page colour <code>{color}</code>
    </p>
  );
}

function ColorControls() {
  const setBackground = useBackground((state) => state.setBackground);

  const handleSlide = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const slide = SLIDES[Number(event.currentTarget.dataset.index)];
      if (slide) {
        setBackground({
          backgroundColor: slide.color,
          backgroundImage: slide.image,
        });
      }
    },
    [setBackground],
  );

  const handleBadColor = useCallback(
    (event: MouseEvent<HTMLButtonElement>) =>
      setBackground({
        backgroundColor: event.currentTarget.dataset.color ?? '',
        backgroundImage: DEFAULT_BACKGROUND_IMAGE,
      }),
    [setBackground],
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-white/60">Crossfade:</span>
        {SLIDES.map((slide, index) => (
          <button
            className={CHIP}
            data-index={index}
            key={slide.label}
            onClick={handleSlide}
            type="button"
          >
            {slide.label} {slide.color}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-white/60">
          Bad values (become the ground):
        </span>
        {BAD_COLORS.map((color) => (
          <button
            className={CHIP}
            data-color={color}
            key={color}
            onClick={handleBadColor}
            type="button"
          >
            <code>{color}</code>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Dev only: the header modes and the page colour system, to check in Chrome. */
export default function ChromeSection() {
  return (
    <Section
      id="chrome"
      source="the header and menu, the header and footer, the frosted pill, the page colour"
      title="Header, menu, footer and page colour"
    >
      <div className="grid gap-6">
        <HeaderState
          mode="static"
          note="the bar at the top (scroll ≤ 60px): 20px logo on a phone, 24px on desktop"
        />
        <HeaderState
          mode="floating"
          note="The frosted pill on scroll-up past 60px: 1024px wide, 24px from the top, 20px logo (12px from the edges on a phone)"
        />
        <HeaderState
          mode="hidden"
          note="scrolled away on scroll-down (empty box); Tab into it brings the pill back"
        />
      </div>
      <p className="mt-4 text-body-sm text-white/80">
        Live: scroll this page down past 60px (the header hides), then up (the
        pill). Follow a link: it is the static bar again. The menu button opens
        the menu inline on desktop and full screen, tinted with the page colour,
        on a phone. Signed in: set the <code>__tvseries_user</code> cookie in
        devtools (display only).
      </p>

      <h3 className="mt-12 text-title-3">Footer</h3>
      <div className={`${BOX} mt-4`}>
        <Footer />
      </div>

      <h3 className="mt-12 text-title-3">Page colour</h3>
      <BackgroundProvider
        initialColor={DEFAULT_PAGE_COLOR}
        initialImage={DEFAULT_BACKGROUND_IMAGE}
      >
        <BackgroundStyle color={DEFAULT_PAGE_COLOR} />
        <div className={`${BOX} mt-4 h-72`}>
          <BackgroundDynamic context="page" />
          <div className="relative z-10 p-6">
            <CurrentColor />
          </div>
        </div>
        <ColorControls />
      </BackgroundProvider>
      <p className="mt-4 text-body-sm text-white/80">
        Back restore: pick a colour, open{' '}
        <Link className="underline" href="/discover">
          Discover
        </Link>{' '}
        (the ground), press Back: the colour you picked is back on the first
        frame. Reaching this page again through a link starts from the ground. A
        hard refresh starts from the server colour.
      </p>
    </Section>
  );
}
