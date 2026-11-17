'use client';

import { create } from 'zustand';

import type { MonthKey } from './diary';

/**
 * The month at the top of the diary (white in Jump to) and whether a jump
 * is on its way, shared by the diary (main column) and Jump to (the
 * sidebar, the phone's sheet). One per tab: a module-level store.
 */
const useDiaryCursor = create<
  Readonly<{ active: MonthKey | null; jumping: boolean }>
>()(() => ({ active: null, jumping: false }));

export const setActiveMonth = (active: MonthKey | null) =>
  useDiaryCursor.setState({ active });

export const getActiveMonth = () => useDiaryCursor.getState().active;

export const setJumping = (jumping: boolean) =>
  useDiaryCursor.setState({ jumping });

/** Whether a jump is on its way, read outside render (the diary's landing effect) */
export const isJumping = () => useDiaryCursor.getState().jumping;

/** The month you're reading; null before the diary has said */
export const useActiveMonth = (): MonthKey | null =>
  useDiaryCursor((state) => state.active);

/** A jump was asked for and its list hasn't landed yet */
export const useJumping = (): boolean =>
  useDiaryCursor((state) => state.jumping);
