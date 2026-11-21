import Image from 'next/image';
import type { MouseEvent } from 'react';

import type { BingeChoice } from './choices';
import { BINGE_CHOICE, BINGE_CHOICES } from './layout';

const CHOICE = `${BINGE_CHOICE} cursor-pointer overflow-hidden opacity-50 transition-[opacity,translate,scale] duration-200 active:scale-96 aria-pressed:-translate-y-1 aria-pressed:opacity-100 aria-pressed:shadow-[0_0_0_2px_#fff]`;

/** The shows to compare; the pressed one is lit */
export default function BingeChoices({
  choices,
  onChoose,
  selected,
}: Readonly<{
  choices: ReadonlyArray<BingeChoice>;
  onChoose: (index: number) => void;
  selected: number;
}>) {
  const choose = (event: MouseEvent<HTMLButtonElement>) =>
    onChoose(Number(event.currentTarget.value));
  return (
    <div className={BINGE_CHOICES}>
      {choices.map((choice, index) => {
        const chosen = index === selected;
        return (
          <button
            aria-label={choice.title}
            aria-pressed={chosen}
            className={CHOICE}
            key={choice.id}
            onClick={choose}
            type="button"
            value={index}
          >
            {choice.poster ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="96px"
                src={choice.poster}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
