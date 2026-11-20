'use client';

import * as m from 'motion/react-m';
import type { ComponentProps } from 'react';
import MaxMotion from '@/components/motion/MaxMotion';
import TileLink from '@/components/ui/tile/TileLink';
import type { ControlStatesRead } from '@/lib/marking/controlState';

import {
  spotlightLineText,
  useSpotlightLines,
} from '../marking/spotlightLines';
import Artwork from './Artwork';
import Pager from './Pager';
import SlideBody from './SlideBody';
import {
  type SpotlightPreview,
  useSpotlightPreview,
} from './SpotlightPreviewContext';
import type { Slide } from './slide';
import { SPOTLIGHT_STAGE, SPOTLIGHT_TEXT_FRAME } from './slideFrame';
import type { StageLayer } from './stage';
import useBackdrops from './useBackdrops';
import useHomeGround from './useHomeGround';
import useSharedStart from './useSharedStart';
import useSlideshow from './useSlideshow';
import useStage from './useStage';

/** No vertical scroll is lost to the swipe */
const PAN_STYLE = { touchAction: 'pan-y' } as const;

type Layers = Readonly<{
  layers: ReadonlyArray<StageLayer>;
  slides: ReadonlyArray<Slide>;
}>;

type ArtworkProps = ComponentProps<typeof Artwork>;

/** The artwork of the slide on top, and of the one it replaces while it fades in */
function ArtworkLayers({
  firstIndex,
  layers,
  onLoaded,
  onSettled,
  slides,
}: Layers &
  Readonly<{
    /** the slide the page opens on: its backdrop is the priority image */
    firstIndex: number;
    onLoaded: ArtworkProps['onLoaded'];
    onSettled: ArtworkProps['onSettled'];
  }>) {
  return layers.map((layer) => {
    const item = slides[layer.index];
    const priority = layer.key === 0 && layer.index === firstIndex;
    return item ? (
      <Artwork
        backdrop={item.backdrop}
        color={item.color}
        key={layer.key}
        layer={layer}
        onLoaded={onLoaded}
        onSettled={onSettled}
        priority={priority}
        seriesId={item.id}
      />
    ) : null;
  });
}

/**
 * Each layer's text: the hook line, or the viewer's personal line once it
 * arrives; every layer but the top one is leaving
 */
function TextLayers({
  layers,
  lines,
  previewLine,
  slides,
  states,
  top,
}: Layers &
  Readonly<{
    lines: ReturnType<typeof useSpotlightLines>;
    previewLine: SpotlightPreview['line'];
    states: ControlStatesRead | undefined;
    top: StageLayer;
  }>) {
  return layers.map((layer) => {
    const item = slides[layer.index];
    if (!item) {
      return null;
    }
    const line = previewLine ?? lines[String(item.id)];
    const hook = line ? spotlightLineText(line) : item.hook;
    const label = `${layer.index + 1} of ${slides.length}: ${item.title}`;
    const leaving = layer !== top;
    return (
      <SlideBody
        entering={layer.entering}
        hook={hook}
        key={layer.key}
        label={label}
        leaving={leaving}
        slide={item}
        states={states}
      />
    );
  });
}

/**
 * The trending spotlight's client island: the stage (the slide's artwork, plus the one it replaces while
 * it fades in), its text and the pager. A switch is one timeline: the
 * artwork, the text and the page colour (the ground's 600ms) start in the
 * same frame and end together, once the next backdrop is decoded (it is
 * preloaded during the countdown and on a pager line's hover or focus).
 * The artwork and the title link to the show, and open it whole: the
 * slide hands its art and logo over to the show page (`showMorph.ts`).
 */
export default function SpotlightCarousel({
  slides,
  states,
}: Readonly<{
  slides: ReadonlyArray<Slide>;
  /** the viewer's states for the slides' controls (the page's one read) */
  states?: ControlStatesRead;
}>) {
  const preview = useSpotlightPreview();

  const { prepare, ready } = useBackdrops(slides);

  // Signed in, a personal line ("Like Severance, which you favourited")
  // replaces the hook once it arrives
  const lines = useSpotlightLines();

  const slideshow = useSlideshow({
    count: slides.length,
    prepare,
    ready,
    startAt: preview?.startAt,
    still: preview?.still,
  });

  const { onLoaded, onSettled, stage, top } = useStage(
    slideshow.index,
    slideshow.instant,
    ready,
  );

  const slide = slides[slideshow.index];
  useHomeGround(slide?.color, slideshow.instant);
  // after the ground's layout effect: the switch's animations start together
  const attach = useSharedStart(top, slideshow.observe);

  if (!slide) {
    return null;
  }
  const titles = slides.map((item) => item.title);
  const firstIndex = preview?.startAt ?? 0;

  // The swipe is a pan gesture: domMax (MaxMotion)
  return (
    <MaxMotion>
      <m.section
        aria-label="Trending spotlight"
        aria-roledescription="carousel"
        // phone: the stage (513px of page) and the 23px pager under it
        className={SPOTLIGHT_STAGE}
        data-show-morph-scope=""
        data-slot="spotlight"
        ref={attach}
        style={PAN_STYLE}
        {...slideshow.handlers}
      >
        <div className="absolute inset-x-0 -top-[47px] h-[560px] overflow-hidden md:top-0 md:h-full">
          <ArtworkLayers
            firstIndex={firstIndex}
            layers={stage.layers}
            onLoaded={onLoaded}
            onSettled={onSettled}
            slides={slides}
          />
          {/* The artwork opens the show too (one link per slide for keyboards
              and screen readers: the title's); only on intent, the title's
              link prefetches in view */}
          <TileLink
            aria-hidden="true"
            backdrop={slide.backdrop}
            className="absolute inset-0"
            draggable={false}
            href={slide.href}
            prefetchOn="intent"
            tabIndex={-1}
          />
        </div>
        <div className={SPOTLIGHT_TEXT_FRAME}>
          <div className="relative mx-auto h-full max-w-page">
            <TextLayers
              layers={stage.layers}
              lines={lines}
              previewLine={preview?.line}
              slides={slides}
              states={states}
              top={top}
            />
            <Pager
              countdownKey={slideshow.countdownKey}
              current={slideshow.target}
              hydrated={slideshow.hydrated}
              onCountdownEnd={slideshow.onCountdownEnd}
              onCountdownStart={slideshow.onCountdownStart}
              onIntent={prepare}
              onSelect={slideshow.goTo}
              onTogglePlay={slideshow.togglePlay}
              pending={slideshow.pending}
              running={slideshow.running}
              titles={titles}
              userChose={slideshow.userChose}
              userPaused={slideshow.userPaused}
            />
          </div>
        </div>
      </m.section>
    </MaxMotion>
  );
}
