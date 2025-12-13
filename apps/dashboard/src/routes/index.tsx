import { createFileRoute } from '@tanstack/react-router';
import { CircleCheck, Expand, ExternalLink } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/components/ui/score-ring';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  getMetricStatusConfig,
  getRatingStatusConfig,
  METRICS_CONFIG,
} from '@/lib/web-vitals';

const RES_STATUS = getRatingStatusConfig('res');

// Dummy route data
const DUMMY_ROUTES = {
  great: [
    { route: '/home', score: 100 },
    { route: '/tv/[id]/cast', score: 99 },
    { route: '/tv/[id]/similar', score: 98 },
    { route: '/u/[username]', score: 100 },
    { route: '/u/[username]/favorites', score: 99 },
    { route: '/u/[username]/finished', score: 97 },
    { route: '/u/[username]/in-progress', score: 96 },
    { route: '/u/[username]/watchlist', score: 100 },
    { route: '/settings/profile', score: 95 },
    { route: '/settings/streaming-services', score: 94 },
    { route: '/track/[id]', score: 100 },
  ],
  needsImprovement: [
    { route: '/discover', score: 72 },
    { route: '/tv/[id]', score: 68 },
    { route: '/person/[id]', score: 55 },
    { route: '/u/[username]/stats', score: 61 },
    { route: '/settings/webhooks', score: 58 },
  ],
  poor: [
    { route: '/tv/[id]/seasons/[season]', score: 28 },
    { route: '/u/[username]/history', score: 35 },
    { route: '/settings/import', score: 42 },
  ],
};

// Dummy country data
const DUMMY_COUNTRIES = {
  great: [
    { country: 'United States', score: 98 },
    { country: 'Canada', score: 97 },
    { country: 'United Kingdom', score: 96 },
    { country: 'Germany', score: 95 },
    { country: 'Netherlands', score: 99 },
    { country: 'Australia', score: 94 },
    { country: 'Japan', score: 93 },
    { country: 'South Korea', score: 92 },
  ],
  needsImprovement: [
    { country: 'Brazil', score: 72 },
    { country: 'India', score: 65 },
    { country: 'Mexico', score: 68 },
    { country: 'Indonesia', score: 58 },
    { country: 'Philippines', score: 62 },
  ],
  poor: [] as Array<{ country: string; score: number }>,
};

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  return (
    <div className="flex min-h-screen justify-center p-8">
      <div className="flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl">Web Vitals</h2>
            <a
              className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              href="https://tvseri.es"
              rel="noopener noreferrer"
              target="_blank"
            >
              https://tvseri.es
              <ExternalLink className="size-3.5" />
            </a>
          </div>
          <ToggleGroup
            className="w-fit gap-1 rounded-full border border-border p-1 mr-5"
            defaultValue="desktop"
            type="single"
          >
            <ToggleGroupItem
              className="rounded-full px-5 py-1.5 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
              value="desktop"
            >
              Desktop
            </ToggleGroupItem>
            <ToggleGroupItem
              className="rounded-full px-5 py-1.5 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
              value="mobile"
            >
              Mobile
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Tabs className="w-full" defaultValue="res" orientation="vertical">
          <TabsList variant="card">
            <TabsTrigger value="res">
              <span className="text-sm text-muted-foreground">
                Real Experience Score
              </span>
              <ScoreRing score={38} size={36} />
            </TabsTrigger>
            <TabsTrigger value="fcp">
              <span className="text-sm text-muted-foreground">
                First Contentful Paint
              </span>
              <span className="text-xl text-green-500">
                1.59<span className="text-base">s</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="lcp">
              <span className="text-sm text-muted-foreground">
                Largest Contentful Paint
              </span>
              <span className="text-xl text-green-500">
                2.48<span className="text-base">s</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="inp">
              <span className="text-sm text-muted-foreground">
                Interaction to Next Paint
              </span>
              <span className="text-xl text-green-500">
                80<span className="text-base">ms</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="cls">
              <span className="text-sm text-muted-foreground">
                Cumulative Layout Shift
              </span>
              <span className="text-xl text-green-500">0</span>
            </TabsTrigger>
            <TabsTrigger value="ttfb">
              <span className="text-sm text-muted-foreground">
                Time to First Byte
              </span>
              <span className="text-xl text-green-500">
                0.5<span className="text-base">s</span>
              </span>
            </TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-hidden rounded-xl border\">
            <TabsContent className="m-0" value="res">
              {/* Header Section */}
              <div className="flex flex-col gap-6 px-0 py-6 md:p-6 md:grid md:grid-cols-5 md:gap-16">
                <div className="md:col-span-2">
                  <p className="mb-1.5 text-sm text-muted-foreground/70">
                    Desktop
                  </p>
                  <h3 className="text-xl font-semibold">
                    Real Experience Score
                  </h3>
                  <ScoreRing className="my-4" score={38} size={90} />
                  <p className="mb-2 font-semibold text-md">
                    {getMetricStatusConfig('res', 38).label}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {(() => {
                      const config = getMetricStatusConfig('res', 38);
                      const Icon = config.Icon;
                      return <Icon className={`size-4 ${config.text}`} />;
                    })()}
                    {getMetricStatusConfig('res', 38).threshold}
                  </p>
                  <p className="mt-4 text-muted-foreground">
                    Less than 75% of visits had a great experience.
                  </p>
                  <hr className="my-4 border-border" />
                  <p className="text-muted-foreground">
                    {METRICS_CONFIG.res.description}
                  </p>
                  <a
                    className="mt-4 inline-flex items-center gap-1 text-blue-500 hover:text-blue-400"
                    href={METRICS_CONFIG.res.learnMoreUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Learn more about {METRICS_CONFIG.res.name}
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 md:col-span-3 md:aspect-auto">
                  <span className="text-muted-foreground">
                    Chart placeholder
                  </span>
                </div>
              </div>
              <hr className="border-border md:mx-6" />
              {/* Routes Section */}
              <div className="px-0 py-6 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Routes</h3>
                  <span className="text-sm text-muted-foreground">RES</span>
                </div>
                {/* Desktop: 3 columns */}
                <div className="hidden grid-cols-3 divide-x md:grid">
                  {/* Poor */}
                  <div className="flex flex-col pr-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 whitespace-nowrap font-medium ${RES_STATUS.poor.text}`}
                      >
                        <RES_STATUS.poor.Icon className="size-4" />
                        {RES_STATUS.poor.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {RES_STATUS.poor.threshold}
                      </span>
                    </div>
                    <div className="relative min-h-48 flex-1">
                      <div className="flex flex-col gap-3">
                        {DUMMY_ROUTES.poor.map((item) => (
                          <div
                            className="flex items-center justify-between gap-4"
                            key={item.route}
                          >
                            <span className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                              {item.route}
                            </span>
                            <span className="shrink-0 font-medium">
                              {item.score}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-background to-transparent">
                        <Button
                          className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                          size="sm"
                          variant="outline"
                        >
                          View All
                          <Expand className="size-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Needs Improvement */}
                  <div className="flex flex-col px-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 whitespace-nowrap font-medium ${RES_STATUS.needsImprovement.text}`}
                      >
                        <RES_STATUS.needsImprovement.Icon className="size-4" />
                        {RES_STATUS.needsImprovement.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {RES_STATUS.needsImprovement.threshold}
                      </span>
                    </div>
                    <div className="relative min-h-48 flex-1">
                      <div className="flex flex-col gap-3">
                        {DUMMY_ROUTES.needsImprovement.map((item) => (
                          <div
                            className="flex items-center justify-between gap-4"
                            key={item.route}
                          >
                            <span className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                              {item.route}
                            </span>
                            <span className="shrink-0 font-medium">
                              {item.score}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-background to-transparent">
                        <Button
                          className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                          size="sm"
                          variant="outline"
                        >
                          View All
                          <Expand className="size-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Great */}
                  <div className="flex flex-col pl-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1.5 whitespace-nowrap font-medium ${RES_STATUS.great.text}`}
                      >
                        <RES_STATUS.great.Icon className="size-4" />
                        {RES_STATUS.great.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {RES_STATUS.great.threshold}
                      </span>
                    </div>
                    <div className="relative min-h-48 flex-1">
                      <div className="flex flex-col gap-3">
                        {DUMMY_ROUTES.great.map((item) => (
                          <div
                            className="flex items-center justify-between gap-4"
                            key={item.route}
                          >
                            <span className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                              {item.route}
                            </span>
                            <span className="shrink-0 font-medium">
                              {item.score}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-background to-transparent">
                        <Button
                          className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                          size="sm"
                          variant="outline"
                        >
                          View All
                          <Expand className="size-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Mobile: Accordion */}
                <Accordion
                  className="rounded-lg border md:hidden"
                  collapsible
                  type="single"
                >
                  <AccordionItem className="border-b-0" value="poor">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center justify-between pr-2">
                        <span
                          className={`flex items-center gap-1.5 whitespace-nowrap ${RES_STATUS.poor.text}`}
                        >
                          <RES_STATUS.poor.Icon className="size-4" />
                          {RES_STATUS.poor.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {RES_STATUS.poor.threshold}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="!p-0">
                      <div className="relative h-56 overflow-hidden">
                        <div className="flex flex-col gap-3 px-4 mt-2">
                          {DUMMY_ROUTES.poor.map((item) => (
                            <div
                              className="flex items-center justify-between gap-4"
                              key={item.route}
                            >
                              <span className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                                {item.route}
                              </span>
                              <span className="shrink-0 font-medium">
                                {item.score}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background to-transparent">
                          <Button
                            className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                            size="sm"
                            variant="outline"
                          >
                            View All
                            <Expand className="size-2.5" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    className="border-b-0"
                    value="needs-improvement"
                  >
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center justify-between pr-2">
                        <span
                          className={`flex items-center gap-1.5 whitespace-nowrap ${RES_STATUS.needsImprovement.text}`}
                        >
                          <RES_STATUS.needsImprovement.Icon className="size-4" />
                          {RES_STATUS.needsImprovement.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {RES_STATUS.needsImprovement.threshold}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="!p-0">
                      <div className="relative h-56 overflow-hidden">
                        <div className="flex flex-col gap-3 px-4 mt-2">
                          {DUMMY_ROUTES.needsImprovement.map((item) => (
                            <div
                              className="flex items-center justify-between gap-4"
                              key={item.route}
                            >
                              <span className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                                {item.route}
                              </span>
                              <span className="shrink-0 font-medium">
                                {item.score}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background to-transparent">
                          <Button
                            className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                            size="sm"
                            variant="outline"
                          >
                            View All
                            <Expand className="size-2.5" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem className="border-b-0" value="great">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center justify-between pr-2">
                        <span
                          className={`flex items-center gap-1.5 whitespace-nowrap ${RES_STATUS.great.text}`}
                        >
                          <RES_STATUS.great.Icon className="size-4" />
                          {RES_STATUS.great.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {RES_STATUS.great.threshold}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="!p-0">
                      <div className="relative h-56 overflow-hidden">
                        <div className="flex flex-col gap-3 px-4 mt-2">
                          {DUMMY_ROUTES.great.map((item) => (
                            <div
                              className="flex items-center justify-between gap-4"
                              key={item.route}
                            >
                              <span className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                                {item.route}
                              </span>
                              <span className="shrink-0 font-medium">
                                {item.score}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background to-transparent">
                          <Button
                            className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                            size="sm"
                            variant="outline"
                          >
                            View All
                            <Expand className="size-2.5" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <hr className="border-border md:mx-6" />
              {/* Countries Section */}
              <div className="px-0 py-6 md:py-6 md:pl-6 md:pr-1">
                <div className="mb-4 grid md:grid-cols-5">
                  <div className="flex items-center justify-between md:col-span-3">
                    <h3 className="font-semibold">Countries</h3>
                    <span className="text-sm text-muted-foreground md:hidden">
                      RES
                    </span>
                  </div>
                  <div className="hidden items-center justify-end md:col-span-2 md:flex">
                    <span className="mr-5 text-sm text-muted-foreground">
                      RES
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-6 md:grid md:grid-cols-5">
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/30 p-4 md:col-span-3">
                    <p className="text-muted-foreground">Map placeholder</p>
                  </div>
                  <div className="md:col-span-2">
                    <Accordion collapsible type="single">
                      <AccordionItem className="border-b-0" value="poor">
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex flex-1 items-center justify-between pr-2">
                            <span
                              className={`flex items-center gap-1.5 whitespace-nowrap ${RES_STATUS.poor.text}`}
                            >
                              <RES_STATUS.poor.Icon className="size-4" />
                              {RES_STATUS.poor.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {RES_STATUS.poor.threshold}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="!p-0">
                          <div className="relative h-56 overflow-hidden">
                            {DUMMY_COUNTRIES.poor.length > 0 ? (
                              <>
                                <div className="mt-2 flex flex-col gap-3 px-4">
                                  {DUMMY_COUNTRIES.poor.map((item) => (
                                    <div
                                      className="flex items-center justify-between gap-4 px-2"
                                      key={item.country}
                                    >
                                      <span className="truncate text-sm text-muted-foreground">
                                        {item.country}
                                      </span>
                                      <span className="shrink-0 font-medium">
                                        {item.score}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background to-transparent">
                                  <Button
                                    className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                                    size="sm"
                                    variant="outline"
                                  >
                                    View All
                                    <Expand className="size-2.5" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-3">
                                <CircleCheck className="size-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  No poor scores
                                </p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem
                        className="border-b-0"
                        value="needs-improvement"
                      >
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex flex-1 items-center justify-between pr-2">
                            <span
                              className={`flex items-center gap-1.5 whitespace-nowrap ${RES_STATUS.needsImprovement.text}`}
                            >
                              <RES_STATUS.needsImprovement.Icon className="size-4" />
                              {RES_STATUS.needsImprovement.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {RES_STATUS.needsImprovement.threshold}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="!p-0">
                          <div className="relative h-56 overflow-hidden">
                            <div className="flex flex-col gap-3 px-4 mt-2">
                              {DUMMY_COUNTRIES.needsImprovement.map((item) => (
                                <div
                                  className="flex items-center justify-between gap-4 px-2"
                                  key={item.country}
                                >
                                  <span className="truncate text-sm text-muted-foreground">
                                    {item.country}
                                  </span>
                                  <span className="shrink-0 font-medium">
                                    {item.score}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background to-transparent">
                              <Button
                                className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                                size="sm"
                                variant="outline"
                              >
                                View All
                                <Expand className="size-2.5" />
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem className="border-b-0" value="great">
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex flex-1 items-center justify-between pr-2">
                            <span
                              className={`flex items-center gap-1.5 whitespace-nowrap ${RES_STATUS.great.text}`}
                            >
                              <RES_STATUS.great.Icon className="size-4" />
                              {RES_STATUS.great.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {RES_STATUS.great.threshold}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="!p-0">
                          <div className="relative h-56 overflow-hidden">
                            <div className="flex flex-col gap-3 px-4 mt-2">
                              {DUMMY_COUNTRIES.great.map((item) => (
                                <div
                                  className="flex items-center justify-between gap-4 px-2"
                                  key={item.country}
                                >
                                  <span className="truncate text-sm text-muted-foreground">
                                    {item.country}
                                  </span>
                                  <span className="shrink-0 font-medium">
                                    {item.score}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background to-transparent">
                              <Button
                                className="mb-4 cursor-pointer gap-1.5 rounded-full !bg-black px-8 py-3 text-xs"
                                size="sm"
                                variant="outline"
                              >
                                View All
                                <Expand className="size-2.5" />
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="fcp">First Contentful Paint</TabsContent>
            <TabsContent value="lcp">Largest Contentful Paint</TabsContent>
            <TabsContent value="inp">Interaction to Next Paint</TabsContent>
            <TabsContent value="cls">Cumulative Layout Shift</TabsContent>
            <TabsContent value="ttfb">Time to First Byte</TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
