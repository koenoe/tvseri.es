'use client';

import type { CSSProperties } from 'react';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { OUTCOME_RGB, type Outcome } from '../_lib/outcome';
import styles from './OutcomeGlow.module.css';

const subscribe = () => () => {};
const getMain = () => document.querySelector('main');
const getNoMain = () => null;

/**
 * The outcome's page tint: a page-level layer
 * behind the header and the page, in the traffic light's tone, that fades in
 * over 96px at the top and out to nothing within the page, so it shows no
 * seam. Drawn into `<main>`, under its content and over its background.
 */
export default function OutcomeGlow({
  outcome,
}: Readonly<{ outcome: Outcome }>) {
  const main = useSyncExternalStore(subscribe, getMain, getNoMain);
  if (!main) {
    return null;
  }
  const style = { '--rc': OUTCOME_RGB[outcome] } as CSSProperties;
  return createPortal(
    <div aria-hidden="true" className={styles.glow} style={style} />,
    main,
  );
}
