import Link from 'next/link';
import Badge from '@/components/ui/button/Badge';
import Button from '@/components/ui/button/Button';
import ButtonLink from '@/components/ui/button/ButtonLink';
import {
  chipStyles,
  textLinkStyles,
} from '@/components/ui/button/buttonStyles';
import ChipLink from '@/components/ui/button/ChipLink';
import CircleButton from '@/components/ui/button/CircleButton';
import { PillSwitch, PillSwitchItem } from '@/components/ui/button/PillSwitch';
import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';
import {
  arrowRightGlyph,
  chevronLeftGlyph,
  chevronRightGlyph,
  closeGlyph,
  eyeGlyph,
  heartGlyph,
  homeGlyph,
  plusGlyph,
  statsGlyph,
  userGlyph,
} from '@/components/ui/icon/glyphs';

import Section from './Section';
import { OnStill, Specimen, State } from './Specimen';

const CHIP_OUTLINE = chipStyles({ variant: 'outline' });
const TEXT_LINK = textLinkStyles({});
const CHIP_PLAIN = chipStyles({});
const CHIP_TONAL = chipStyles({ variant: 'tonal' });

const VARIANTS = ['primary', 'outline', 'glass', 'tonal', 'quiet'] as const;
const SIZES = ['xs', 'sm', 'md', 'lg'] as const;
const CIRCLE_SIZES = [32, 36, 40, 44, 48] as const;

export default function ButtonSection() {
  return (
    <Section
      id="buttons"
      source="the shared button styles"
      title="Buttons, chips and badges"
    >
      <p className="text-body-sm text-white/60">
        Hover, press and focus (Tab) them for those states.
      </p>
      <PillSpecimens />
      <StillSpecimens />
      <CircleSpecimens />
      <ChipSpecimens />
    </Section>
  );
}

function PillSpecimens() {
  return (
    <>
      <Specimen
        label="Pill variants · md 40px · default, pressed, disabled, pending"
        note="primary, outline, glass and sheet buttons"
      >
        <div className="grid gap-4">
          {VARIANTS.map((variant) => (
            <div className="flex flex-wrap items-center gap-3" key={variant}>
              <span className="w-20 text-caption text-white/60">{variant}</span>
              <Button icon={plusGlyph} variant={variant}>
                Watchlist
              </Button>
              <Button icon={eyeGlyph} pressed variant={variant}>
                Watched
              </Button>
              <Button disabled variant={variant}>
                Disabled
              </Button>
              <Button icon={plusGlyph} pending variant={variant}>
                Saving
              </Button>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen
        label="Sizes · 32 / 36 / 40 / 44"
        note="sizes xs, sm, md and lg"
      >
        {SIZES.map((size) => (
          <State key={size} name={size}>
            <Button icon={eyeGlyph} size={size}>
              Seen it
            </Button>
          </State>
        ))}
      </Specimen>
      <Specimen label="Show actions" note="Actions">
        <Button icon={plusGlyph} variant="primary">
          Watchlist
        </Button>
        <Button icon={eyeGlyph}>Seen it</Button>
      </Specimen>
      <Specimen label="Text buttons (links)" note="Text buttons">
        <ButtonLink href="/genre/crime" icon={arrowRightGlyph}>
          Search crime
        </ButtonLink>
        <ButtonLink href="/discover" icon={arrowRightGlyph}>
          Back to Discover
        </ButtonLink>
        <Link className={TEXT_LINK} href="/dev/style-guide">
          See full history
        </Link>
      </Specimen>
      <Specimen label="Dialog footer" note="Cancel + primary">
        <Button variant="quiet">Cancel</Button>
        <Button variant="primary">Mark 3 episodes · just now</Button>
        <Button aria-disabled variant="primary">
          Mark 0 episodes
        </Button>
      </Specimen>
    </>
  );
}

function StillSpecimens() {
  return (
    <>
      <Specimen
        label="Eye pill · xs on a still (static look; the WatchButton owns the logic)"
        note="Eye pill on a still: mark, watched, next up, skipped"
      >
        <OnStill>
          <Button icon={eyeGlyph} size="xs" variant="scrim">
            Mark watched
          </Button>
          <Button icon={eyeGlyph} pressed size="xs" variant="scrim">
            Jul 19
          </Button>
          <Button
            className="border-cyan/60 [&>svg]:text-cyan"
            icon={eyeGlyph}
            size="xs"
            variant="scrim"
          >
            Mark watched
          </Button>
          <Button className="text-white/60" size="xs" variant="scrim">
            Skipped
          </Button>
        </OnStill>
      </Specimen>
      <Specimen
        label="Cyan Next up pill"
        note="Next up pill (40 and 44): Next up first"
      >
        <OnStill>
          <Button icon={eyeGlyph} variant="accent">
            Mark S03E05 watched
          </Button>
          <Button icon={eyeGlyph} size="lg" variant="accent">
            Mark S03E05 watched
          </Button>
        </OnStill>
      </Specimen>
      <Specimen label="Error page actions" note="Solid and glass over a still">
        <OnStill>
          <Button icon={userGlyph} variant="primary">
            Sign in
          </Button>
          <Button icon={statsGlyph} variant="glass">
            See @maria’s stats
          </Button>
          <Button icon={homeGlyph} variant="glass">
            Home
          </Button>
        </OnStill>
      </Specimen>
    </>
  );
}

function CircleSpecimens() {
  return (
    <>
      <Specimen
        label="Circle buttons · sizes"
        note="Circle buttons: 32, 36, 40, 44, 48"
      >
        {CIRCLE_SIZES.map((size) => (
          <State key={size} name={String(size)}>
            <CircleButton icon={heartGlyph} label="Favourite" size={size} />
          </State>
        ))}
      </Specimen>
      <Specimen
        label="Circle states · default, pressed, disabled, on a still"
        note="Row arrows, pressed circles and tools on a still"
      >
        <State name="default">
          <CircleButton icon={chevronRightGlyph} label="Next" size={40} />
        </State>
        <State name="pressed">
          <CircleButton icon={heartGlyph} label="Favourite" pressed size={48} />
        </State>
        <State name="disabled">
          <CircleButton
            disabled
            icon={chevronLeftGlyph}
            label="Previous"
            size={40}
          />
        </State>
        <State name="glass on a still">
          <OnStill className="p-3">
            <CircleButton icon={closeGlyph} label="Close" tone="glass" />
          </OnStill>
        </State>
      </Specimen>
    </>
  );
}

function ChipSpecimens() {
  return (
    <>
      <Specimen label="Row switch + keyword chips" note="Row switch and chips">
        <Segmented label="Kind of crime">
          <SegmentedItem pressed>Detectives</SegmentedItem>
          <SegmentedItem pressed={false}>Serial killers</SegmentedItem>
          <SegmentedItem pressed={false}>Police</SegmentedItem>
        </Segmented>
        <ChipLink href="/theme/post-apocalyptic">Post-apocalyptic</ChipLink>
        <ChipLink href="/theme/robots-and-ai">Robots and AI</ChipLink>
        <button aria-pressed className={CHIP_PLAIN} type="button">
          Selected
        </button>
      </Specimen>
      <Specimen
        label="Pill switch on a picture: From your circle's picks, the Countdown's premieres"
        note="Pills: From your circle, the Countdown steps"
      >
        <OnStill>
          <PillSwitch label="Picks">
            <PillSwitchItem pressed>Dark</PillSwitchItem>
            <PillSwitchItem pressed={false}>McMafia</PillSwitchItem>
            <PillSwitchItem pressed={false}>Frieren</PillSwitchItem>
          </PillSwitch>
        </OnStill>
      </Specimen>
      <Specimen label="Sheet chips · 30px" note="Sheet chips">
        <button className={CHIP_TONAL} type="button">
          Just now
        </button>
        <button aria-pressed className={CHIP_TONAL} type="button">
          On release dates
        </button>
        <button className={CHIP_OUTLINE} type="button">
          Not now
        </button>
      </Specimen>
      <Specimen label="Badges" note="New badge, episode code badge and count">
        <span className="inline-flex items-center gap-2 text-body-sm">
          I don’t remember <Badge>New</Badge>
        </span>
        <Badge variant="code">S04E02</Badge>
        <Badge variant="count">12</Badge>
      </Specimen>
    </>
  );
}
