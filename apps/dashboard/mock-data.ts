/**
 * Mock data for metrics endpoints during development
 * Based on actual routes from apps/web
 */

// Generate dates for the last N days
function generateDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]!);
  }
  return dates;
}

// Generate random value with some variance around a base
function randomAround(base: number, variance: number): number {
  return Math.round((base + (Math.random() - 0.5) * variance) * 100) / 100;
}

// Generate metric stats with full percentile distribution
function generateMetricStats(p75Base: number, variance: number, isCLS = false) {
  const p75 = randomAround(p75Base, variance);
  const p90 = randomAround(p75 * 1.3, variance * 0.5);
  const p95 = randomAround(p75 * 1.6, variance * 0.5);
  const p99 = randomAround(p75 * 2.2, variance * 0.5);
  const count = Math.floor(randomAround(4000, 1500));

  // Generate realistic ratings distribution
  const goodPct =
    Math.random() > 0.2 ? randomAround(0.85, 0.15) : randomAround(0.6, 0.2);
  const poorPct =
    Math.random() > 0.8 ? randomAround(0.15, 0.1) : randomAround(0.05, 0.05);
  const needsImprovementPct = 1 - goodPct - poorPct;

  return {
    count,
    p75: isCLS ? Math.abs(p75) : Math.round(p75),
    p90: isCLS ? Math.abs(p90) : Math.round(p90),
    p95: isCLS ? Math.abs(p95) : Math.round(p95),
    p99: isCLS ? Math.abs(p99) : Math.round(p99),
    ratings: {
      good: Math.round(count * Math.max(0, Math.min(1, goodPct))),
      needsImprovement: Math.round(
        count * Math.max(0, Math.min(1, needsImprovementPct)),
      ),
      poor: Math.round(count * Math.max(0, Math.min(1, poorPct))),
    },
  };
}

// Generate daily metrics with full stats structure (for time series)
function generateDailyMetrics(days: number) {
  const dates = generateDates(days);
  return dates.map((date) => ({
    CLS: generateMetricStats(0.02, 0.03, true),
    date,
    FCP: generateMetricStats(1600, 400),
    INP: generateMetricStats(85, 40),
    LCP: generateMetricStats(2400, 600),
    pageviews: Math.floor(randomAround(4000, 2000)),
    score: Math.round(randomAround(92, 10)),
    TTFB: generateMetricStats(900, 300),
  }));
}

// Actual routes from apps/web
const ROUTES = [
  '/home',
  '/discover',
  '/tv/[id]',
  '/tv/[id]/seasons',
  '/tv/[id]/seasons/[season]',
  '/tv/[id]/cast',
  '/tv/[id]/similar',
  '/person/[id]',
  '/u/[username]',
  '/u/[username]/favorites',
  '/u/[username]/finished',
  '/u/[username]/history',
  '/u/[username]/in-progress',
  '/u/[username]/watchlist',
  '/u/[username]/social',
  '/u/[username]/stats',
  '/settings/profile',
  '/settings/streaming-services',
  '/settings/webhooks',
  '/settings/import',
  '/track/[id]',
];

// Generate route metrics with realistic distribution
function generateRouteMetrics() {
  const highTrafficRoutes = ['/home', '/tv/[id]', '/discover', '/u/[username]'];
  const mediumTrafficRoutes = [
    '/tv/[id]/seasons',
    '/u/[username]/history',
    '/u/[username]/watchlist',
    '/person/[id]',
  ];

  return ROUTES.map((route) => {
    const isHighTraffic = highTrafficRoutes.includes(route);
    const isMediumTraffic = mediumTrafficRoutes.includes(route);

    const basePageviews = isHighTraffic ? 8000 : isMediumTraffic ? 2000 : 500;
    const pageviews = Math.floor(
      randomAround(basePageviews, basePageviews * 0.5),
    );

    // Most routes should be "great", some "needs improvement", few "poor"
    const scoreBase = Math.random() > 0.15 ? 94 : Math.random() > 0.3 ? 70 : 40;
    const score = Math.round(randomAround(scoreBase, 8));

    return {
      CLS: generateMetricStats(0.02, 0.04, true),
      FCP: generateMetricStats(1600, 500),
      INP: generateMetricStats(90, 50),
      LCP: generateMetricStats(2500, 800),
      pageviews,
      route,
      score: Math.min(100, Math.max(0, score)),
      TTFB: generateMetricStats(900, 400),
    };
  }).sort((a, b) => b.pageviews - a.pageviews);
}

// Countries with realistic distribution
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
];

function generateCountryMetrics() {
  const highTrafficCountries = ['US', 'GB', 'DE', 'NL', 'CA'];

  return COUNTRIES.map((country) => {
    const isHighTraffic = highTrafficCountries.includes(country.code);
    const basePageviews = isHighTraffic ? 5000 : 800;
    const pageviews = Math.floor(
      randomAround(basePageviews, basePageviews * 0.6),
    );

    // US tends to have slightly worse scores due to geographic distribution
    const scoreBase =
      country.code === 'US'
        ? 68
        : country.code === 'IN' || country.code === 'BR'
          ? 72
          : 92;
    const score = Math.round(randomAround(scoreBase, 10));

    return {
      CLS: generateMetricStats(0.02, 0.04, true),
      country: country.name,
      countryCode: country.code,
      FCP: generateMetricStats(1600, 600),
      INP: generateMetricStats(90, 60),
      LCP: generateMetricStats(2500, 1000),
      pageviews,
      score: Math.min(100, Math.max(0, score)),
      TTFB: generateMetricStats(900, 500),
    };
  }).sort((a, b) => b.pageviews - a.pageviews);
}

// Generate aggregated metrics with full stats structure
function generateAggregatedMetrics() {
  return {
    CLS: generateMetricStats(0.02, 0.03, true),
    FCP: generateMetricStats(1600, 400),
    INP: generateMetricStats(85, 40),
    LCP: generateMetricStats(2400, 600),
    pageviews: Math.floor(randomAround(28000, 5000)),
    score: Math.round(randomAround(92, 8)),
    TTFB: generateMetricStats(900, 300),
  };
}

// Generate the full mock data set
export function generateMockSummary(days = 7) {
  const series = generateDailyMetrics(days);
  const aggregated = generateAggregatedMetrics();

  return {
    aggregated,
    dataPoints: aggregated.pageviews,
    days,
    series,
  };
}

export function generateMockRoutes() {
  return {
    routes: generateRouteMetrics(),
  };
}

export function generateMockCountries() {
  return {
    countries: generateCountryMetrics(),
  };
}
