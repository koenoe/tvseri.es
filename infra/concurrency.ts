/**
 * Reserved concurrency in production only. A reservation is taken from the
 * account's quota even while idle, and AWS keeps 100 of it unreserved, so
 * reserving on every stage lets only a few stages (dev, `pr-{n}`) fit in an
 * account before a deploy fails. Other stages share the unreserved pool.
 * https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
 */
export const productionReserved = (stage: string, count: number) =>
  stage === 'production' ? count : undefined;
