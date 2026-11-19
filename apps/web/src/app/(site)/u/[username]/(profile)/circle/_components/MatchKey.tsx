import type { TasteLevel } from '@tvseri.es/schemas';

import {
  LEVELS,
  STRONGEST_FIRST,
} from '../../_components/visitor/match/levels';
import { CIRCLE_COPY } from '../../_lib/circleCopy';

function KeyRow({ level }: Readonly<{ level: TasteLevel }>) {
  const { hex, word } = LEVELS[level];
  const dot = { backgroundColor: hex };
  return (
    <li className="flex h-8 items-center gap-3 rounded-8 px-3 text-[14px] leading-5 font-medium text-white/80">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={dot}
      />
      {word}
    </li>
  );
}

/**
 * "How a match is made" (the owner's sidebar under the identity): the
 * weights in one line and the six levels with their colours. Static copy,
 * so it sits in the page's shell.
 */
export default function MatchKey() {
  return (
    <section aria-labelledby="match-key-title">
      <h2
        className="m-0 text-[15px] leading-6 font-semibold"
        id="match-key-title"
      >
        {CIRCLE_COPY.matchKeyTitle}
      </h2>
      <p className="m-0 mt-3 text-body-sm text-white/70">
        {CIRCLE_COPY.matchKeyText}
      </p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-0.5 p-0">
        {STRONGEST_FIRST.map((level) => (
          <KeyRow key={level} level={level} />
        ))}
      </ul>
    </section>
  );
}
