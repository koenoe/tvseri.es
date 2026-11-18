import type { CSSProperties } from 'react';

import cn from '@/lib/cn';

import styles from './Ripple.module.css';

const RINGS = [0, 1, 2, 3, 4, 5, 6] as const;

const RING_STYLES = RINGS.map((i) => ({ '--i': i }) as CSSProperties);

/**
 * The Ripple, finite: `breathe` three times
 * while importing, `settle` once on success, in the outcome's tone (`--rc`
 * on a parent). `className` places its centre.
 */
export default function Ripple({
  className,
  mode,
}: Readonly<{ className?: string; mode: 'breathe' | 'settle' }>) {
  const classes = cn(
    styles.ripple,
    mode === 'breathe' ? styles.breathe : cn(styles.settle, styles.toned),
    className,
  );
  return (
    <span aria-hidden="true" className={classes}>
      {RINGS.map((i) => (
        <i className={styles.ring} key={i} style={RING_STYLES[i]} />
      ))}
    </span>
  );
}
