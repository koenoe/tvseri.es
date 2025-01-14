'use client';

import { memo } from 'react';

import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

const START_GRADIENT_POSITION = -130;
const END_GRADIENT_POSITION = 210;
const MAX_GRADIENT_Y = 216 - 121;
const GLOWING_LINE_HEIGHT = 81;

type SvgGlowAnimateProps = {
  movementDelay?: number;
  id: number;
  additionalHeight?: number;
  initialGradientY?: number;
  color: string;
  className?: string;
};

function SvgGlowAnimate({
  movementDelay = 0,
  id,
  additionalHeight = 0,
  initialGradientY = 0,
  color,
  className,
}: SvgGlowAnimateProps) {
  const svgHeight = 228 + additionalHeight;
  const endY1 = MAX_GRADIENT_Y - GLOWING_LINE_HEIGHT;
  const endY2 = endY1 + (END_GRADIENT_POSITION - START_GRADIENT_POSITION);

  return (
    <motion.svg
      width="12"
      height={svgHeight}
      viewBox={`0 0 12 ${svgHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={twMerge('transform-gpu', className)}
    >
      <path id={`main-line-${id}`} d={`M6 ${svgHeight} L6 0`} />

      <motion.use
        href={`#main-line-${id}`}
        style={{
          stroke: `url(#gradient-glow-${id})`,
          strokeWidth: 6,
          filter: `blur(2px) drop-shadow(0px 0px 2px ${color})`,
          WebkitFilter: `blur(2px) drop-shadow(0px 0px 2px ${color})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 2,
          times: [0, 0.5, 1],
          ease: 'linear',
          repeat: Infinity,
          delay: movementDelay / 1000,
        }}
      />

      <use
        href={`#main-line-${id}`}
        stroke={`url(#gradient-solid-${id})`}
        strokeWidth="4"
      />

      <defs>
        <motion.linearGradient
          id={`gradient-glow-${id}`}
          x1="6"
          x2="6"
          gradientUnits="userSpaceOnUse"
          initial={{
            y1: START_GRADIENT_POSITION,
            y2: END_GRADIENT_POSITION,
          }}
          animate={{
            y1: [START_GRADIENT_POSITION, endY1],
            y2: [END_GRADIENT_POSITION, endY2],
          }}
          transition={{
            duration: 2,
            ease: 'linear',
            repeat: Infinity,
            delay: movementDelay / 1000,
            repeatDelay: 0,
          }}
        >
          <stop offset="0.38" stopColor={color} stopOpacity="0" />
          <stop offset="0.5" stopColor={color} stopOpacity="0.8" />
          <stop offset="0.62" stopColor={color} stopOpacity="0" />
        </motion.linearGradient>

        <linearGradient
          id={`gradient-solid-${id}`}
          x1="6"
          y1={initialGradientY}
          x2="6"
          y2={svgHeight}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={color} stopOpacity="0" />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

export default memo(SvgGlowAnimate);
