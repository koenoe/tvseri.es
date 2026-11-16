/**
 * Hand-kept data for the home page's toys of the day. TMDB ids; check a new
 * entry on themoviedb.org before adding it.
 */

export type WhereSetPlace = Readonly<{
  lat: number;
  lng: number;
  name: string;
  /** Shows set there, best known first; one is shown per day */
  showIds: ReadonlyArray<number>;
  slug: string;
}>;

/** "Where are they set?": place, map position and the shows set there */
export const WHERE_SET_PLACES: ReadonlyArray<WhereSetPlace> = [
  {
    lat: 39.2904,
    lng: -76.6122,
    name: 'Baltimore',
    showIds: [1438, 4464, 125949],
    slug: 'baltimore',
  }, // The Wire, Homicide: Life on the Street, We Own This City
  {
    lat: 35.0844,
    lng: -106.6504,
    name: 'Albuquerque',
    showIds: [1396, 60059],
    slug: 'albuquerque',
  }, // Breaking Bad, Better Call Saul
  {
    lat: 6.2476,
    lng: -75.5658,
    name: 'Medellín',
    showIds: [63351, 43348],
    slug: 'medellin',
  }, // Narcos, Pablo Escobar: El Patrón del Mal
  {
    lat: 40.4168,
    lng: -3.7038,
    name: 'Madrid',
    showIds: [71446, 71225],
    slug: 'madrid',
  }, // Money Heist, Cable Girls
  {
    lat: 51.3945,
    lng: 30.0996,
    name: 'Pripyat',
    showIds: [87108],
    slug: 'pripyat',
  }, // Chernobyl
  {
    lat: 9.512,
    lng: 100.0136,
    name: 'Koh Samui',
    showIds: [111803],
    slug: 'koh-samui',
  }, // The White Lotus
  {
    lat: 52.4862,
    lng: -1.8904,
    name: 'Birmingham',
    showIds: [60574, 215253],
    slug: 'birmingham',
  }, // Peaky Blinders, This Town
  {
    lat: 41.8781,
    lng: -87.6298,
    name: 'Chicago',
    showIds: [136315, 34307, 4588],
    slug: 'chicago',
  }, // The Bear, Shameless (US), ER
];

export type WhatsOnNetwork = Readonly<{
  id: number;
  name: string;
}>;

/**
 * "What's on": the six channels on the remote (TMDB network ids, checked on
 * themoviedb.org), in display order
 */
export const WHATS_ON_NETWORKS: ReadonlyArray<WhatsOnNetwork> = [
  { id: 213, name: 'Netflix' },
  { id: 3186, name: 'HBO Max' },
  { id: 2552, name: 'Apple TV' },
  { id: 4330, name: 'Paramount+' },
  { id: 1024, name: 'Prime Video' },
  { id: 453, name: 'Hulu' },
];
