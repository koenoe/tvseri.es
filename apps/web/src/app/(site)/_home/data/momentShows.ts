import type { Feature, Toy } from '@tvseri.es/schemas';

/** The shows a feature of the day puts on screen (for Neighbours never repeat) */
export function featureShowIds(feature: Feature): number[] {
  switch (feature.kind) {
    case 'countdown':
      return feature.premieres.map((premiere) => premiere.series.id);
    case 'did-you-know':
      return feature.facts.map((fact) => fact.series.id);
    case 'binge':
      return [
        feature.series.id,
        ...(feature.shows ?? []).map((show) => show.series.id),
      ];
    default:
      return [feature.series.id];
  }
}

/** The shows a toy of the day puts on screen */
export function toyShowIds(toy: Toy): number[] {
  switch (toy.kind) {
    case 'connected-by':
      return toy.paths.flatMap((path) =>
        path.nodes.flatMap((node) =>
          node.type === 'show' ? [node.series.id] : [],
        ),
      );
    case 'whats-on':
      return toy.channels.map((channel) => channel.series.id);
    case 'where-set':
      return toy.places.map((place) => place.series.id);
    case 'versus':
      return toy.pairs.flatMap(({ left, right }) => [left.id, right.id]);
  }
}
