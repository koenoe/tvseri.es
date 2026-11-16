import { describe, expect, it } from 'vitest';

import { type MetricDataPage, sumMetricPages } from './sumMetricPages';

describe('sumMetricPages', () => {
  const pages: ReadonlyArray<MetricDataPage> = [
    {
      MetricDataResults: [
        { Label: 'Requests', Values: [5, 5] },
        { Label: 'FunctionInvocations', Values: [1] },
      ],
      NextToken: 'page-2',
    },
    {
      // A metric's values can continue on the next page
      MetricDataResults: [
        { Label: 'Requests', Values: [10] },
        { Label: 'BytesDownloaded', Values: [100] },
      ],
      NextToken: 'page-3',
    },
    { MetricDataResults: [{ Label: 'Requests', Values: [1] }] },
  ];

  it('follows NextToken to the last page and sums every value per label', async () => {
    const tokens: Array<string | undefined> = [];
    const totals = await sumMetricPages(async (nextToken) => {
      tokens.push(nextToken);
      const index = nextToken ? Number(nextToken.split('-')[1]) - 1 : 0;
      return pages[index] ?? {};
    });

    expect(tokens).toEqual([undefined, 'page-2', 'page-3']);
    expect(totals).toEqual({
      BytesDownloaded: 100,
      FunctionInvocations: 1,
      Requests: 21,
    });
  });

  it('reads a single page when there is no NextToken', async () => {
    let calls = 0;
    const totals = await sumMetricPages(async () => {
      calls++;
      return { MetricDataResults: [{ Label: 'Requests', Values: [3] }] };
    });
    expect(calls).toBe(1);
    expect(totals).toEqual({ Requests: 3 });
  });
});
