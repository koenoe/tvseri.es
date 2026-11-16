import Image from 'next/image';
import type { MouseEvent } from 'react';

import type { BingeChoice } from './choices';
import { BINGE_CHOICE, BINGE_CHOICES } from './layout';

const CHOICE = `${BINGE_CHOICE} cursor-pointer overflow-hidden opacity-50 transition-[opacity,translate] duration-200 aria-pressed:-translate-y-1 aria-pressed:opacity-100 aria-pressed:shadow-[0_0_0_2px_#fff]`;

/**
 * The shows to compare (HMFinal `e2-bps`): 96 × 144 posters at half
 * opacity; the pressed one is lit, ringed and lifted 4px.
 */
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
      {choices.map((choice, index) => (
        <button
          aria-label={choice.title}
          aria-pressed={index === selected}
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
      ))}
    </div>
  );
}
