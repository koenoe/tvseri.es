import type { CircleMatch, CirclePerson } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  circleCounts,
  followNobodyLine,
  levelLabel,
  levelLine,
  pickReason,
  proofLine,
  relationTags,
  seasonsAndEpisodes,
} from './circleCopy';

const show = (
  title: string,
  relation: CircleMatch['sharedShows'][number]['relation'] = 'both-finished',
) => ({ id: title.length, relation, title });

const match = (overrides: Partial<CircleMatch>): CircleMatch => ({
  level: 'high',
  sharedCount: 19,
  sharedShows: [],
  ...overrides,
});

describe('proofLine (the one-line reason beside the level)', () => {
  it('names what you both love before what you both watch', () => {
    expect(
      proofLine(
        match({
          level: 'super',
          sharedShows: [
            show('The Pitt', 'both-favourite'),
            show('Severance', 'both-watching'),
            show('Andor', 'both-finished'),
          ],
        }),
      ),
    ).toBe('You both love The Pitt and watch Severance');
  });

  it('says watch for finished and in-progress shows alike, two names at most', () => {
    expect(
      proofLine(
        match({
          level: 'very-high',
          sharedShows: [
            show('The White Lotus'),
            show('MobLand', 'both-watching'),
            show('Barry'),
          ],
        }),
      ),
    ).toBe('You both watch The White Lotus and MobLand');
  });

  it('says love for two favourites', () => {
    expect(
      proofLine(
        match({
          sharedShows: [
            show('The Bear', 'both-favourite'),
            show('Slow Horses', 'both-favourite'),
          ],
        }),
      ),
    ).toBe('You both love The Bear and Slow Horses');
  });

  it('names one show when only one is known', () => {
    expect(
      proofLine(match({ level: 'medium', sharedShows: [show('Severance')] })),
    ).toBe('You both watch Severance');
  });

  it('a low match names one show and counts the rest in words', () => {
    expect(
      proofLine(
        match({
          level: 'low',
          sharedCount: 5,
          sharedShows: [show('MobLand'), show('Barry'), show('Dark')],
        }),
      ),
    ).toBe('You share MobLand and four more');
    expect(
      proofLine(
        match({ level: 'low', sharedCount: 14, sharedShows: [show('Dark')] }),
      ),
    ).toBe('You share Dark and 13 more');
  });

  it('a very low match says the taste differs', () => {
    expect(
      proofLine(
        match({
          level: 'very-low',
          sharedCount: 6,
          sharedShows: [show('Black Doves'), show('MobLand'), show('Dark')],
        }),
      ),
    ).toBe('Different taste: you share Black Doves and MobLand');
  });

  it('without a level, says how many are shared so far', () => {
    expect(
      proofLine(
        match({
          level: null,
          sharedCount: 3,
          sharedShows: [show('Dark')],
        }),
      ),
    ).toBe('Not enough shared yet: 3 series');
    expect(proofLine(match({ level: null, sharedCount: 1 }))).toBe(
      'Not enough shared yet: 1 series',
    );
    expect(proofLine(match({ level: null, sharedCount: 0 }))).toBe(
      'Nothing shared yet',
    );
  });

  it('falls back to the count when no title came with a level', () => {
    expect(proofLine(match({ level: 'high', sharedCount: 19 }))).toBe(
      'You share 19 series',
    );
  });
});

describe('levelLine', () => {
  it('is the level word and match, or No level yet', () => {
    expect(levelLine('super')).toBe('Super match');
    expect(levelLine('very-high')).toBe('Very high match');
    expect(levelLine('very-low')).toBe('Very low match');
    expect(levelLine(null)).toBe('No level yet');
  });
});

describe('circleCounts (the header count)', () => {
  it('reads "8 following · 6 followers"', () => {
    expect(circleCounts({ followers: 6, following: 8 })).toBe(
      '8 following · 6 followers',
    );
    expect(circleCounts({ followers: 1, following: 2 })).toBe(
      '2 following · 1 follower',
    );
    expect(circleCounts({ followers: 1200, following: 0 })).toBe(
      '0 following · 1,200 followers',
    );
  });
});

describe('relationTags (a visitor’s rows)', () => {
  const person = { isFollower: false, isFollowing: false, isMe: false };

  it('says It’s you on yourself, and nothing else', () => {
    expect(
      relationTags({ isFollower: true, isFollowing: true, isMe: true }),
    ).toEqual(['It’s you']);
  });

  it('says You follow, then Follows you', () => {
    expect(
      relationTags({ ...person, isFollower: true, isFollowing: true }),
    ).toEqual(['You follow', 'Follows you']);
    expect(relationTags({ ...person, isFollower: true })).toEqual([
      'Follows you',
    ]);
    expect(relationTags(person)).toEqual([]);
  });
});

describe('followNobodyLine (you follow nobody)', () => {
  it('points at the people below who already follow you', () => {
    expect(followNobodyLine(2)).toBe(
      'Follow someone from their profile; the two people below already follow you.',
    );
    expect(followNobodyLine(1)).toBe(
      'Follow someone from their profile; the person below already follows you.',
    );
    expect(followNobodyLine(14)).toBe(
      'Follow someone from their profile; the 14 people below already follow you.',
    );
  });

  it('just says how, with nobody below', () => {
    expect(followNobodyLine(0)).toBe('Follow someone from their profile.');
  });
});

const person = (
  username: string,
  level: CirclePerson['level'],
): CirclePerson => ({ id: username, level, username });

describe('pickReason', () => {
  it('a favourite of the closest match', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'favourite',
        people: [person('juno', 'super')],
      }),
    ).toBe('A favourite of your closest match.');
  });

  it('both closest matches finished it', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'finished',
        people: [person('juno', 'super'), person('margaux', 'very-high')],
      }),
    ).toBe('Both your closest matches finished it.');
  });

  it('a door line names the genre in lower case', () => {
    expect(
      pickReason({
        doorGenre: 'Anime',
        kind: 'favourite',
        people: [person('ivo', 'medium')],
      }),
    ).toBe('ivo’s door to anime.');
  });

  it('names the person when they are not a close match', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'favourite',
        people: [person('ivo', 'medium')],
      }),
    ).toBe('A favourite of ivo.');
    expect(
      pickReason({
        doorGenre: null,
        kind: 'finished',
        people: [person('ivo', 'low'), person('juno', 'super')],
      }),
    ).toBe('ivo and juno finished it.');
  });

  it('one person finishing, and no people at all', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'finished',
        people: [person('juno', 'very-high')],
      }),
    ).toBe('Your closest match finished it.');
    expect(pickReason({ doorGenre: null, kind: 'favourite', people: [] })).toBe(
      'A favourite in your circle.',
    );
  });
});

describe('labels', () => {
  it('names the six levels, and none under 5 shared shows', () => {
    expect(levelLabel('very-high')).toBe('Very high');
    expect(levelLabel('very-low')).toBe('Very low');
    expect(levelLabel(null)).toBeNull();
  });

  it('seasons and episodes, with whatever is known', () => {
    expect(seasonsAndEpisodes(3, 26)).toBe('3 seasons, 26 episodes');
    expect(seasonsAndEpisodes(1, 8)).toBe('1 season, 8 episodes');
    expect(seasonsAndEpisodes(0, 0)).toBeNull();
  });
});
