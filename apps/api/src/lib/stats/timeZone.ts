const DEFAULT_TIME_ZONE = 'Europe/London';

// The main zone of the country (most people); countries that span several
// zones use their most populous one
const COUNTRY_TIME_ZONES: Readonly<Record<string, string>> = {
  AR: 'America/Argentina/Buenos_Aires',
  AT: 'Europe/Vienna',
  AU: 'Australia/Sydney',
  BE: 'Europe/Brussels',
  BR: 'America/Sao_Paulo',
  CA: 'America/Toronto',
  CH: 'Europe/Zurich',
  CL: 'America/Santiago',
  CZ: 'Europe/Prague',
  DE: 'Europe/Berlin',
  DK: 'Europe/Copenhagen',
  ES: 'Europe/Madrid',
  FI: 'Europe/Helsinki',
  FR: 'Europe/Paris',
  GB: 'Europe/London',
  GR: 'Europe/Athens',
  HU: 'Europe/Budapest',
  IE: 'Europe/Dublin',
  IN: 'Asia/Kolkata',
  IT: 'Europe/Rome',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  MX: 'America/Mexico_City',
  NL: 'Europe/Amsterdam',
  NO: 'Europe/Oslo',
  NZ: 'Pacific/Auckland',
  PL: 'Europe/Warsaw',
  PT: 'Europe/Lisbon',
  RO: 'Europe/Bucharest',
  SE: 'Europe/Stockholm',
  TR: 'Europe/Istanbul',
  US: 'America/New_York',
  ZA: 'Africa/Johannesburg',
};

export const timeZoneForCountry = (country: string | undefined) =>
  COUNTRY_TIME_ZONES[country?.toUpperCase() ?? ''] ?? DEFAULT_TIME_ZONE;

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      month: '2-digit',
      timeZone,
      weekday: 'short',
      year: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The local hour (0-23), weekday (0 = Monday) and date (`YYYY-MM-DD`) of a moment in a zone */
export const localParts = (ms: number, timeZone: string) => {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(ms)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
  };
};
