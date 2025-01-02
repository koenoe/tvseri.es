'use client';

import React, { type CSSProperties } from 'react';

import { cx } from 'class-variance-authority';

interface RippleProps {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
}

const Ripple = React.memo(function Ripple({
  mainCircleSize = 150,
  mainCircleOpacity = 0.3,
  numCircles = 20,
  className,
}: RippleProps) {
  return (
    <div
      className={cx(
        'absolute inset-0 flex items-center justify-center bg-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)]',
        className,
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.03;
        const animationDelay = `${i * 0.06}s`;
        const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid';
        const borderOpacity = 5 + i * 5;

        return (
          <div
            key={i}
            className={`animate-ripple absolute left-1/2 top-1/2 translate-x-1/2 translate-y-1/2 border bg-white/15 shadow-xl [--i:${i}]`}
            style={
              {
                borderRadius: '50%',
                width: `${size}px`,
                height: `${size}px`,
                opacity: opacity,
                animationDelay: animationDelay,
                borderStyle: borderStyle,
                borderWidth: '1px',
                borderColor: `rgba(255,255,255, ${borderOpacity / 100})`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});

Ripple.displayName = 'Ripple';

export default Ripple;
