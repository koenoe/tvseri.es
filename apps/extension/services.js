// The services, by the id the site's routes use. A new service is an entry
// here plus its host permissions in the manifest. `sessionCookie` only
// keeps the signed-out error honest: the link route test-reads the jar
// anyway. Logos are simple-icons (CC0).
export const SERVICES = {
  bbc: {
    cookieDomain: 'bbc.co.uk',
    logo: 'icons/services/bbc.svg',
    name: 'BBC iPlayer',
    sessionCookie: 'ckns_id',
    shortName: 'BBC',
    site: 'bbc.co.uk/iplayer',
  },
  netflix: {
    cookieDomain: 'netflix.com',
    logo: 'icons/services/netflix.svg',
    name: 'Netflix',
    sessionCookie: 'NetflixId',
    shortName: 'Netflix',
    site: 'netflix.com',
  },
  prime: {
    cookieDomain: 'primevideo.com',
    logo: 'icons/services/prime.svg',
    name: 'Prime Video',
    sessionCookie: 'session-token',
    shortName: 'Prime Video',
    site: 'primevideo.com',
  },
};

export const SERVICE_IDS = Object.keys(SERVICES);

/** The site's link route for a service */
export const linkPath = (service) => `/api/connections/${service}/link`;

/** The site's check of a code, before Continue: whose account it links to */
export const checkPath = (service) => `${linkPath(service)}/check`;
