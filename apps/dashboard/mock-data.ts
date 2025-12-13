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

// Generate route metrics with varied distribution across all status groups
function generateRouteMetrics(device = 'desktop') {
  const isMobile = device === 'mobile';
  const highTrafficRoutes = ['/home', '/tv/[id]', '/discover', '/u/[username]'];
  const mediumTrafficRoutes = [
    '/tv/[id]/seasons',
    '/u/[username]/history',
    '/u/[username]/watchlist',
    '/person/[id]',
  ];
  // Routes that will have poor metrics (for testing)
  const poorRoutes = isMobile
    ? ['/settings/import', '/track/[id]', '/tv/[id]/seasons', '/person/[id]']
    : ['/settings/import', '/track/[id]'];
  // Routes that will have needs improvement metrics
  const needsImprovementRoutes = isMobile
    ? ['/u/[username]/stats', '/settings/webhooks', '/home', '/discover']
    : ['/u/[username]/stats', '/settings/webhooks'];

  return ROUTES.map((route) => {
    const isHighTraffic = highTrafficRoutes.includes(route);
    const isMediumTraffic = mediumTrafficRoutes.includes(route);
    const isPoor = poorRoutes.includes(route);
    const isNeedsImprovement = needsImprovementRoutes.includes(route);

    // Mobile has less traffic
    const trafficMultiplier = isMobile ? 0.6 : 1;
    const basePageviews = isHighTraffic ? 8000 : isMediumTraffic ? 2000 : 500;
    const pageviews = Math.floor(
      randomAround(basePageviews * trafficMultiplier, basePageviews * 0.5),
    );

    // Assign scores based on route category - mobile is generally worse
    let scoreBase: number;
    let lcpBase: number;
    let inpBase: number;

    if (isPoor) {
      scoreBase = isMobile ? 28 : 35;
      lcpBase = isMobile ? 5500 : 5000;
      inpBase = isMobile ? 700 : 600;
    } else if (isNeedsImprovement) {
      scoreBase = isMobile ? 55 : 65;
      lcpBase = isMobile ? 3800 : 3500;
      inpBase = isMobile ? 420 : 350;
    } else {
      scoreBase = isMobile ? 85 : 94;
      lcpBase = isMobile ? 2300 : 2000;
      inpBase = isMobile ? 160 : 120;
    }

    const score = Math.round(randomAround(scoreBase, 5));

    return {
      CLS: generateMetricStats(
        isPoor ? 0.3 : isNeedsImprovement ? 0.15 : 0.05,
        0.02,
        true,
      ),
      FCP: generateMetricStats(
        isPoor ? 3500 : isNeedsImprovement ? 2200 : 1400,
        200,
      ),
      INP: generateMetricStats(inpBase, 30),
      LCP: generateMetricStats(lcpBase, 300),
      pageviews,
      route,
      score: Math.min(100, Math.max(0, score)),
      TTFB: generateMetricStats(
        isPoor ? 2000 : isNeedsImprovement ? 1200 : 600,
        100,
      ),
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

function generateCountryMetrics(device = 'desktop') {
  const isMobile = device === 'mobile';
  const highTrafficCountries = ['US', 'GB', 'DE', 'NL', 'CA'];
  // Countries with poor metrics (distant/slower infrastructure) - more on mobile
  const poorCountries = isMobile ? ['IN', 'BR', 'MX', 'PL'] : ['IN', 'BR'];
  // Countries with needs improvement metrics - more on mobile
  const needsImprovementCountries = isMobile
    ? ['US', 'AU', 'JP', 'ES']
    : ['MX', 'PL'];

  return COUNTRIES.map((country) => {
    const isHighTraffic = highTrafficCountries.includes(country.code);
    const isPoor = poorCountries.includes(country.code);
    const isNeedsImprovement = needsImprovementCountries.includes(country.code);

    // Mobile has less traffic
    const trafficMultiplier = isMobile ? 0.65 : 1;
    const basePageviews = isHighTraffic ? 5000 : 800;
    const pageviews = Math.floor(
      randomAround(basePageviews * trafficMultiplier, basePageviews * 0.6),
    );

    let scoreBase: number;
    let lcpBase: number;
    let inpBase: number;
    let clsBase: number;

    if (isPoor) {
      scoreBase = isMobile ? 32 : 38;
      lcpBase = isMobile ? 6000 : 5500;
      inpBase = isMobile ? 620 : 550;
      clsBase = isMobile ? 0.32 : 0.28;
    } else if (isNeedsImprovement) {
      scoreBase = isMobile ? 56 : 62;
      lcpBase = isMobile ? 3600 : 3200;
      inpBase = isMobile ? 380 : 320;
      clsBase = isMobile ? 0.2 : 0.18;
    } else {
      scoreBase = isMobile ? 82 : 92;
      lcpBase = isMobile ? 2400 : 2000;
      inpBase = isMobile ? 140 : 100;
      clsBase = isMobile ? 0.06 : 0.04;
    }

    const score = Math.round(randomAround(scoreBase, 5));

    return {
      CLS: generateMetricStats(clsBase, 0.02, true),
      country: country.name,
      countryCode: country.code,
      FCP: generateMetricStats(
        isPoor ? 3800 : isNeedsImprovement ? 2400 : 1400,
        200,
      ),
      INP: generateMetricStats(inpBase, 30),
      LCP: generateMetricStats(lcpBase, 300),
      pageviews,
      score: Math.min(100, Math.max(0, score)),
      TTFB: generateMetricStats(
        isPoor ? 2200 : isNeedsImprovement ? 1300 : 600,
        100,
      ),
    };
  }).sort((a, b) => b.pageviews - a.pageviews);
}

// Generate aggregated metrics with full stats structure
// Thresholds (in ms for time-based, converted to seconds in display):
// - FCP: great ≤1800, poor >3000
// - LCP: great ≤2500, poor >4000
// - INP: great ≤200, poor >500
// - CLS: great ≤0.1, poor >0.25
// - TTFB: great ≤800, poor >1800
// - RES: great >90, poor <50
function generateAggregatedMetrics(device = 'desktop') {
  const isMobile = device === 'mobile';

  // Mobile typically has worse metrics due to slower networks and less powerful devices
  if (isMobile) {
    return {
      CLS: generateMetricStats(0.18, 0.03, true), // needs improvement (0.1-0.25) - ORANGE
      FCP: generateMetricStats(2400, 300), // needs improvement (1800-3000ms) - ORANGE
      INP: generateMetricStats(550, 50), // poor (>500ms) - RED
      LCP: generateMetricStats(3200, 400), // needs improvement (2500-4000ms) - ORANGE
      pageviews: Math.floor(randomAround(18000, 4000)),
      score: Math.round(randomAround(58, 5)), // needs improvement (50-90) - ORANGE
      TTFB: generateMetricStats(1400, 200), // needs improvement (800-1800ms) - ORANGE
    };
  }

  // Desktop - better performance overall
  return {
    CLS: generateMetricStats(0.05, 0.02, true), // great (≤0.1)
    FCP: generateMetricStats(1500, 200), // great (≤1800ms)
    INP: generateMetricStats(350, 50), // needs improvement (200-500ms) - ORANGE
    LCP: generateMetricStats(4500, 300), // poor (>4000ms) - RED
    pageviews: Math.floor(randomAround(28000, 5000)),
    score: Math.round(randomAround(94, 3)), // great (>90) - GREEN
    TTFB: generateMetricStats(650, 100), // great (≤800ms)
  };
}

// Generate the full mock data set
export function generateMockSummary(days = 7, device = 'desktop') {
  const series = generateDailyMetrics(days);
  const aggregated = generateAggregatedMetrics(device);

  return {
    aggregated,
    dataPoints: aggregated.pageviews,
    days,
    series,
  };
}

export function generateMockRoutes(device = 'desktop') {
  return {
    routes: generateRouteMetrics(device),
  };
}

export function generateMockCountries(device = 'desktop') {
  return {
    countries: generateCountryMetrics(device),
  };
}
