'use client';

import type { Variants } from 'motion/react';
import * as m from 'motion/react-m';

import MenuEntry from './MenuEntry';
import type { MenuItem, MenuModel } from './menuItems';

/** How one layout draws the groups (MobileMenu, DesktopMenu) */
export type MenuLook = Readonly<{
  /** the account line (signed in): Settings · Sign out */
  account: string;
  accountItem: string;
  /** a group's overline (WATCH, YOU · @handle, ACCOUNT) */
  label: string;
  /** a label after the first group */
  laterLabel: string;
  /** desktop: each word list fades in */
  listVariants?: Variants;
  /** under Sign in */
  note: string;
  /** the profile pages */
  page: string;
  /** Home, Discover, Sign in */
  word: string;
  /** phone: each word rises in, `custom` its place from the bottom */
  wordVariants?: Variants;
}>;

const NOTE = 'An email code or Google. No password.';

/**
 * The menu's groups from one item model: WATCH home,
 * discover; signed in YOU · @handle with overview, library, history, stats
 * and the account line; signed out ACCOUNT with sign in and its note. One
 * component for both layouts, so content, order and the current-page mark
 * are defined once.
 */
export default function MenuGroups({
  look,
  model,
  onNavigate,
}: Readonly<{
  look: MenuLook;
  model: MenuModel;
  onNavigate: () => void;
}>) {
  const words = [
    ...model.watch,
    ...(model.you?.items ?? []),
    ...(model.signIn ? [model.signIn] : []),
  ];
  // the words rise from the bottom up: the last word goes first
  const fromBottom = (item: MenuItem) => words.length - 1 - words.indexOf(item);

  const list = (items: ReadonlyArray<MenuItem>, className: string) => (
    <m.ul className="flex flex-col items-start" variants={look.listVariants}>
      {items.map((item) => (
        <m.li
          className="flex"
          custom={fromBottom(item)}
          key={item.id}
          variants={look.wordVariants}
        >
          <MenuEntry
            className={className}
            item={item}
            onNavigate={onNavigate}
          />
        </m.li>
      ))}
    </m.ul>
  );

  const label = (text: string, first: MenuItem | undefined, later: boolean) => (
    <m.p
      className={later ? look.laterLabel : look.label}
      custom={first ? fromBottom(first) : 0}
      variants={look.wordVariants}
    >
      {text}
      {later && model.you ? (
        <span className="normal-case tracking-normal">
          {' '}
          · @{model.you.handle}
        </span>
      ) : null}
    </m.p>
  );

  return (
    <>
      {label('Watch', model.watch[0], false)}
      {list(model.watch, look.word)}
      {model.you ? (
        <>
          {label('You', model.you.items[0], true)}
          {list(model.you.items, look.page)}
          <m.ul
            className={look.account}
            custom={0}
            variants={look.wordVariants}
          >
            {model.account.map((item) => (
              <li className="flex" key={item.id}>
                <MenuEntry
                  className={look.accountItem}
                  item={item}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </m.ul>
        </>
      ) : null}
      {model.signIn ? (
        <>
          {label('Account', model.signIn, true)}
          {list([model.signIn], look.word)}
          <m.p className={look.note} custom={0} variants={look.wordVariants}>
            {NOTE}
          </m.p>
        </>
      ) : null}
    </>
  );
}
