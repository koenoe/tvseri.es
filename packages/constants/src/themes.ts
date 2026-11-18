/**
 * The theme landings (`/theme/{slug}`): a measured list, one entry per theme.
 * A theme is what a show is about (a story hook, a kind of person, a
 * creature, a setting or period, a subject) or an established subgenre. It is
 * a set of TMDB keyword ids joined with OR, strongest first, plus a required
 * TMDB genre (`genreId`) only where the keywords alone pull in shows outside
 * the idea. Each entry's comment is its definition and the count it passed
 * with (shows with 300+ TMDB votes over the union of its keywords).
 *
 * Rules for an entry (all eleven, in this order):
 * 1. It completes "a show about, set in, or featuring ___"; a subgenre is the
 *    only exception and names its parent genre.
 * 2. Formats, sources, audiences, production origin and moods are not themes.
 * 3. At least 20 shows with 300+ TMDB votes across its keyword union.
 * 4. Viewer warrant: a term viewers use, or a named row in two services.
 * 5. It does not duplicate another theme or a lens (genre, network, country,
 *    language, decade); duplicates merge.
 * 6. Objective and spoiler-free: knowable from the premise, never a mood.
 * 7. Durable: evergreen, or a cycle that recurs with the same meaning.
 * 8. It describes the whole series, judged by the top shows its keywords
 *    return.
 * 9. A set of keyword ids (OR), plus a required genre only where needed.
 * 10. Plain names in sentence case: people, creatures and show kinds in the
 *     plural, other ideas as a singular noun, US spelling (as TMDB).
 * 11. About 40 to 70 entries in five to seven labelled groups; when in doubt,
 *     merge. A keyword id belongs to one theme at most.
 *
 * Keeping it: twice a year, count every theme's union (`with_keywords=a|b|c`,
 * `vote_count.gte=300`) and the close dropped ideas (heist, prison, cold war,
 * neo-noir, cooking). Drop or merge a theme only after it falls under 20 on
 * two reviews in a row; bring an idea back once it reaches 20 and meets the
 * other rules. At each review look for new duplicate keywords of each theme
 * (prefer old, low ids; remove ids that stop returning shows). A new theme
 * waits until it has two years of use outside one fandom. Every change goes
 * in its commit message with the reason and the count that justified it.
 * Once `/theme/` pages are public, a renamed, merged or dropped slug redirects
 * permanently to its new home (a theme, another lens or the hub).
 */

/** The six groups the themes fall into, in their order */
const THEME_GROUPS = [
  { id: 'hooks', name: 'Story hooks' },
  { id: 'people', name: "Who it's about" },
  { id: 'creatures', name: 'Creatures and the supernatural' },
  { id: 'setting', name: 'Where and when' },
  { id: 'subjects', name: 'Subjects' },
  { id: 'subgenres', name: 'Subgenres' },
] as const;

type ThemeGroup = (typeof THEME_GROUPS)[number]['id'];

export type Theme = Readonly<{
  name: string;
  group: ThemeGroup;
  /** TMDB keyword ids, strongest first; a show with any of them is in */
  keywordIds: ReadonlyArray<number>;
  /** A TMDB genre a show must also have (the subgenres that need one) */
  genreId?: number;
}>;

export const THEMES: Readonly<Record<string, Theme>> = {
  /**
   * Life from other worlds, as invaders, visitors or neighbours. (76
   * well-known shows; alien 9951, alien invasion 14909, extraterrestrial 9739,
   * aliens 273439)
   */
  aliens: {
    group: 'creatures',
    keywordIds: [9951, 14909, 9739, 273439],
    name: 'Aliens',
  },
  /**
   * Worlds that branch off from ours: parallel universes, other dimensions and
   * histories that went another way. (29 well-known shows; parallel universe
   * 243230, alternate history 12026, alternative reality 175629, alternate
   * dimension 9820)
   */
  'alternate-realities': {
    group: 'hooks',
    keywordIds: [243230, 12026, 175629, 9820],
    name: 'Alternate realities',
  },
  /**
   * Young characters growing up: the first time they choose who they are. (67
   * well-known shows; coming of age 10683)
   */
  'coming-of-age': {
    group: 'hooks',
    keywordIds: [10683],
    name: 'Coming of age',
  },
  /**
   * Someone uncovers a hidden plan by powerful people and has to prove it, or
   * survive knowing it. (39 well-known shows; conspiracy 10410)
   */
  conspiracy: { group: 'hooks', keywordIds: [10410], name: 'Conspiracy' },
  /**
   * Comedy about death, crime and misery: funny and bleak at once. (57
   * well-known shows; dark comedy 10123)
   */
  'dark-comedies': {
    group: 'subgenres',
    keywordIds: [10123],
    name: 'Dark comedies',
  },
  /**
   * Fantasy with horror in it: cursed worlds, monsters and heroes who pay for
   * their power. (49 well-known shows; dark fantasy 177895)
   */
  'dark-fantasy': {
    group: 'subgenres',
    keywordIds: [177895],
    name: 'Dark fantasy',
  },
  /**
   * A professional or amateur investigator solves cases, and the series
   * follows how they think. (74 well-known shows; detective 703, private
   * detective 155790)
   */
  detectives: {
    group: 'people',
    keywordIds: [703, 155790],
    name: 'Detectives',
  },
  /**
   * Dealing, trafficking and the cartels, and everyone caught up in them. (44
   * well-known shows; drugs 14964, drug dealer 2231, drug cartel 10175, drug
   * trafficking 2149, drug crime 2151)
   */
  'drug-trade': {
    group: 'subjects',
    keywordIds: [14964, 2231, 10175, 2149, 2151],
    name: 'Drug trade',
  },
  /**
   * Societies built to control people, from surveillance states to high-tech,
   * low-life futures. (49 well-known shows; dystopia 4565, cyberpunk 12190,
   * totalitarianism 178712)
   */
  dystopia: {
    group: 'hooks',
    keywordIds: [4565, 12190, 178712],
    name: 'Dystopia',
  },
  /**
   * Invented worlds of kingdoms, quests, swords and sorcery. (47 well-known
   * shows; fantasy world 170362, medieval 161257, sword and sorcery 234213)
   */
  'epic-fantasy': {
    genreId: 10765,
    group: 'subgenres',
    keywordIds: [170362, 161257, 234213],
    name: 'Epic fantasy',
  },
  /**
   * Families pulling together and tearing apart: dynasties, feuds, businesses
   * and secrets. (39 well-known shows; dysfunctional family 10041, family
   * conflict 155294, family drama 12279, family business 5683)
   */
  'family-dramas': {
    genreId: 18,
    group: 'subgenres',
    keywordIds: [10041, 155294, 12279, 5683],
    name: 'Family dramas',
  },
  /**
   * The dead who stay: hauntings, haunted houses and people who can see them.
   * (33 well-known shows; ghost 162846, haunted house 3358)
   */
  ghosts: { group: 'creatures', keywordIds: [162846, 3358], name: 'Ghosts' },
  /**
   * Teenagers and school life: classes, cliques, first loves and growing
   * pains. (179 well-known shows; high school 6270, school life 190116, teen
   * drama 193400, teenager 296608, boarding school 6271)
   */
  'high-school': {
    group: 'setting',
    keywordIds: [6270, 190116, 193400, 296608, 6271],
    name: 'High school',
  },
  /**
   * Someone from our world is transported or reborn into another one, usually
   * a fantasy or game world. (23 well-known shows; isekai 237451)
   */
  isekai: { group: 'hooks', keywordIds: [237451], name: 'Isekai' },
  /**
   * Lawyers, trials and the law firms between them. (38 well-known shows;
   * lawyer 10909, courtroom 33519, legal drama 222517, law firm 162813,
   * courtroom drama 214780, legal thriller 254459)
   */
  'legal-dramas': {
    group: 'subgenres',
    keywordIds: [10909, 33519, 222517, 162813, 214780, 254459],
    name: 'Legal dramas',
  },
  /**
   * Stories centred on LGBTQ+ characters and their lives. (63 well-known
   * shows; lgbt 158718, lgbt teen 163037, coming out 1862, queer 250606, gay
   * 363345)
   */
  lgbtq: {
    group: 'subjects',
    keywordIds: [158718, 163037, 1862, 250606, 363345],
    name: 'LGBTQ+',
  },
  /**
   * Spells, witches and wizards, and the people who wield or fear them. (123
   * well-known shows; magic 2343, witch 616, witchcraft 40931)
   */
  magic: { group: 'creatures', keywordIds: [2343, 616, 40931], name: 'Magic' },
  /**
   * Fighters and the disciplines they train in, from dojo rivalries to kung fu
   * epics. (43 well-known shows; martial arts 779, martial arts master 14731,
   * martial artist 14941)
   */
  'martial-arts': {
    group: 'subjects',
    keywordIds: [779, 14731, 14941],
    name: 'Martial arts',
  },
  /**
   * Doctors, nurses and patients in hospitals and clinics. (21 well-known
   * shows; medical drama 208788, hospital 11612)
   */
  'medical-dramas': {
    genreId: 18,
    group: 'subgenres',
    keywordIds: [208788, 11612],
    name: 'Medical dramas',
  },
  /**
   * Soldiers and armed forces: units, missions and the wars they fight, World
   * War II included. (42 well-known shows; military 162365, world war ii 1956)
   */
  military: { group: 'setting', keywordIds: [162365, 1956], name: 'Military' },
  /**
   * Creatures that hunt, haunt or rampage, from creature features to giant
   * kaiju. (35 well-known shows; monster 1299, kaiju 161791)
   */
  monsters: {
    group: 'creatures',
    keywordIds: [1299, 161791],
    name: 'Monsters',
  },
  /**
   * Whodunits: a death, a set of suspects and the question of who did it. (28
   * well-known shows; murder mystery 207046, whodunit 12570)
   */
  'murder-mysteries': {
    group: 'subgenres',
    keywordIds: [207046, 12570],
    name: 'Murder mysteries',
  },
  /**
   * Gods, heroes and monsters from the old myths, retold or loose in the
   * modern world. (27 well-known shows; mythology 2035, greek mythology 2036,
   * norse mythology 179101)
   */
  mythology: {
    group: 'creatures',
    keywordIds: [2035, 2036, 179101],
    name: 'Mythology',
  },
  /**
   * Mobs, gangs and crime families, and the people who run or fight them. (35
   * well-known shows; organized crime 10291, mafia 10391, gangster 3149, crime
   * boss 9730, yakuza 1794)
   */
  'organised-crime': {
    group: 'subjects',
    keywordIds: [10291, 10391, 3149, 9730, 1794],
    name: 'Organised crime',
  },
  /**
   * Dramas set in the past, with the costumes, manners and rules of their
   * time. (59 well-known shows; historical drama 192772, period drama 15060,
   * costume drama 195013)
   */
  'period-dramas': {
    group: 'subgenres',
    keywordIds: [192772, 15060, 195013],
    name: 'Period dramas',
  },
  /**
   * Cops and federal agents at work: cases, partners and the job itself, from
   * procedurals to cop comedies. (108 well-known shows; police 6149, police
   * procedural 268067, fbi 1812, police detective 15167, fbi agent 272551)
   */
  police: {
    group: 'people',
    keywordIds: [6149, 268067, 1812, 15167, 272551],
    name: 'Police',
  },
  /**
   * Power and government: campaigns, cabinets, intrigue and the people who run
   * things. (45 well-known shows; politics 6078, political intrigue 41282,
   * political thriller 209817)
   */
  politics: {
    group: 'subjects',
    keywordIds: [6078, 41282, 209817],
    name: 'Politics',
  },
  /**
   * Life after civilisation has collapsed, from war, plague or catastrophe.
   * (63 well-known shows; post-apocalyptic future 4458, apocalypse 12332,
   * pandemic 188973, epidemic 17995, post-apocalyptic 359337, post-apocalypse
   * 384784)
   */
  'post-apocalyptic': {
    group: 'hooks',
    keywordIds: [4458, 12332, 188973, 17995, 359337, 384784],
    name: 'Post-apocalyptic',
  },
  /**
   * Suspense driven by minds: obsession, manipulation and cat-and-mouse games.
   * (68 well-known shows; psychological 272553, psychological thriller 12565,
   * psychological drama 309029, mind game 184312, mind games 226106)
   */
  'psychological-thrillers': {
    group: 'subgenres',
    keywordIds: [272553, 12565, 309029, 184312, 226106],
    name: 'Psychological thrillers',
  },
  /**
   * A wronged character sets out to make someone pay, and the series follows
   * the plan. (55 well-known shows; revenge 9748)
   */
  revenge: { group: 'hooks', keywordIds: [9748], name: 'Revenge' },
  /**
   * Artificial minds and machines: androids, AIs and the giant robots people
   * pilot. (56 well-known shows; robot 14544, artificial intelligence (a.i.)
   * 310, android 803, mecha 10046, giant robot 10891)
   */
  'robots-and-ai': {
    group: 'creatures',
    keywordIds: [14544, 310, 803, 10046, 10891],
    name: 'Robots and AI',
  },
  /**
   * Kings, queens and heirs, and the courts and intrigues around them, real or
   * invented. (28 well-known shows; royal family 4833, royalty 9920, prince
   * 3071, monarchy 2471, british royal family 215634)
   */
  royalty: {
    group: 'people',
    keywordIds: [4833, 9920, 3071, 2471, 215634],
    name: 'Royalty',
  },
  /**
   * Comedy that mocks politics, media and society on purpose. (27 well-known
   * shows; satire 8201, social satire 11514)
   */
  satire: { group: 'subgenres', keywordIds: [8201, 11514], name: 'Satire' },
  /**
   * The hunt for someone who kills again and again, from either side. (36
   * well-known shows; serial killer 10714)
   */
  'serial-killers': {
    group: 'people',
    keywordIds: [10714],
    name: 'Serial killers',
  },
  /**
   * Series set in the 1980s, whenever they were made. (27 well-known shows;
   * 1980s 208289)
   */
  'set-in-the-1980s': {
    group: 'setting',
    keywordIds: [208289],
    name: 'Set in the 1980s',
  },
  /**
   * Everyday life with low stakes: work, school, friends and small changes,
   * told for their own sake. (44 well-known shows; slice of life 9914)
   */
  'slice-of-life': {
    group: 'subgenres',
    keywordIds: [9914],
    name: 'Slice of life',
  },
  /**
   * A small community where everyone knows everyone, and secrets do not stay
   * buried. (40 well-known shows; small town 1415)
   */
  'small-town': { group: 'setting', keywordIds: [1415], name: 'Small town' },
  /**
   * Stories set among the stars: starships, stations and other planets. (58
   * well-known shows; space 9882, space travel 3801, space opera 161176,
   * spacecraft 1612, space western 11606, space exploration 191132)
   */
  space: {
    group: 'setting',
    keywordIds: [9882, 3801, 161176, 1612, 11606, 191132],
    name: 'Space',
  },
  /**
   * Agents, handlers and moles working in secret for a government or against
   * one. (36 well-known shows; spy 470, espionage 5265, secret agent 4289, spy
   * thriller 217282)
   */
  spies: {
    group: 'people',
    keywordIds: [470, 5265, 4289, 217282],
    name: 'Spies',
  },
  /**
   * Teams, athletes and competition, on the field and off it. (34 well-known
   * shows; sports 6075, football (soccer) 13042, basketball 6496, wrestling
   * 5970, boxing 209476, baseball 1480)
   */
  sports: {
    group: 'subjects',
    keywordIds: [6075, 13042, 6496, 5970, 209476, 1480],
    name: 'Sports',
  },
  /**
   * People with powers, in costume or not, and what they do with them. (147
   * well-known shows; superhero 9715, super power 33637)
   */
  superheroes: {
    group: 'people',
    keywordIds: [9715, 33637],
    name: 'Superheroes',
  },
  /**
   * Forces beyond nature break into ordinary life: demons, possession, the
   * paranormal. (153 well-known shows; supernatural 6152, demon 15001,
   * supernatural horror 256183, paranormal phenomena 11627, exorcism 2626,
   * supernatural phenomena 196975)
   */
  supernatural: {
    group: 'creatures',
    keywordIds: [6152, 15001, 256183, 11627, 2626, 196975],
    name: 'Supernatural',
  },
  /**
   * People cut off from safety who have to stay alive against nature, other
   * people or something worse. (60 well-known shows; survival 10349)
   */
  survival: { group: 'hooks', keywordIds: [10349], name: 'Survival' },
  /**
   * Characters move through time, or relive the same stretch of it, and have
   * to live with what that changes. (57 well-known shows; time travel 4379,
   * time machine 5455, time loop 10854)
   */
  'time-travel': {
    group: 'hooks',
    keywordIds: [4379, 5455, 10854],
    name: 'Time travel',
  },
  /**
   * Real crimes, told as documentaries or dramatised. (20 well-known shows;
   * true crime 33722)
   */
  'true-crime': { group: 'subgenres', keywordIds: [33722], name: 'True crime' },
  /**
   * Vampires as heroes, villains or neighbours. (40 well-known shows; vampire
   * 3133)
   */
  vampires: { group: 'creatures', keywordIds: [3133], name: 'Vampires' },
  /**
   * Comedies built around a job and the people stuck doing it together. (25
   * well-known shows; workplace comedy 210605, workplace 6282, office 1438)
   */
  'workplace-comedies': {
    genreId: 35,
    group: 'subgenres',
    keywordIds: [210605, 6282, 1438],
    name: 'Workplace comedies',
  },
  /**
   * The dead walk, and the living try to outlast them. (23 well-known shows;
   * zombie 12377, zombie apocalypse 186565, undead 10327)
   */
  zombies: {
    group: 'creatures',
    keywordIds: [12377, 186565, 10327],
    name: 'Zombies',
  },
};
