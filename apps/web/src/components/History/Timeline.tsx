'use client';

import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { memo, useRef } from 'react';

export interface TimelineEntry {
  content: React.ReactNode;
  title: string;
}

type Props = Readonly<{
  data: ReadonlyArray<TimelineEntry>;
}>;

function Timeline({ data }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Track the viewport scroll position (absolute pixels)
  const { scrollY } = useScroll();

  // Calculate beam height in pixels based on how far we've scrolled past the container's top
  const beamHeight = useTransform(scrollY, (scrollPosition) => {
    if (!contentRef.current) return 0;

    const rect = contentRef.current.getBoundingClientRect();
    const containerTop = scrollPosition + rect.top;
    const containerHeight = contentRef.current.offsetHeight;

    // How far the viewport midpoint has traveled into the container
    const viewportMidpoint = scrollPosition + window.innerHeight * 0.5;
    const distanceIntoContainer = viewportMidpoint - containerTop;

    // Clamp between 0 and container height
    return Math.max(0, Math.min(distanceIntoContainer, containerHeight));
  });

  // Smooth the pixel height with spring physics
  const smoothHeight = useSpring(beamHeight, {
    damping: 30,
    restDelta: 0.5,
    stiffness: 100,
  });

  return (
    <div className="relative -ml-4 w-[calc(100%+1rem)] md:ml-0 md:w-full">
      <motion.div className="relative pb-10" layoutScroll ref={contentRef}>
        {data.map((item, index) => (
          <div
            className="flex justify-start gap-4 pt-10 md:gap-8 md:pt-16"
            key={index}
          >
            {/* Left column: dot + title (sticky on desktop) */}
            <div className="sticky top-40 z-40 flex w-10 flex-shrink-0 flex-row items-start self-start md:w-48">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900">
                <div className="h-4 w-4 rounded-full border border-neutral-700 bg-neutral-800" />
              </div>
              <h3 className="hidden whitespace-nowrap py-2 pl-4 text-xl font-bold text-neutral-500 md:block">
                {item.title}
              </h3>
            </div>

            {/* Right column: content */}
            <div className="relative min-w-0 flex-1">
              <h3 className="mb-4 block text-xl font-bold text-neutral-500 md:hidden">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}

        {/* Timeline beam track (static background line) */}
        <div className="absolute left-[19px] top-0 h-full w-[2px] bg-neutral-800" />

        {/* Timeline beam - solid color that grows, with gradient glow at the tip */}
        <div className="absolute left-[19px] top-0 h-full w-[2px] overflow-hidden">
          {/* Solid beam */}
          <motion.div
            className="absolute left-0 top-0 w-full bg-[#00FFFF]"
            style={{ height: smoothHeight }}
          />
          {/* Gradient tip that follows the beam end */}
          <motion.div
            className="pointer-events-none absolute left-1/2 w-8 -translate-x-1/2"
            style={{
              background:
                'linear-gradient(to bottom, transparent, #FF0080 20%, #00FFFF 80%, transparent)',
              height: '80vh',
              top: smoothHeight,
              transform: 'translateX(-50%) translateY(-75%)',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

Timeline.displayName = 'Timeline';

export default memo(Timeline);
