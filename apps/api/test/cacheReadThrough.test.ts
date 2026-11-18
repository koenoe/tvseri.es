import { describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const today = new Date().toISOString().slice(0, 10);

/** Every Cache-table read fails (throttled, a network blip), the rest works */
const failCacheReads = () => {
  const send = db.send.bind(db);
  return vi.spyOn(db, 'send').mockImplementation(async (command) => {
    const input = (command as { input?: { TableName?: string } }).input;
    const name = (command as { constructor: { name: string } }).constructor
      .name;
    if (
      input?.TableName === 'Cache' &&
      (name === 'GetItemCommand' || name === 'BatchGetItemCommand')
    ) {
      throw Object.assign(new Error('throttled'), {
        name: 'ThrottlingException',
      });
    }
    return send(command);
  });
};

// Every shared Cache-table read goes through readThrough, where a
// cache failure is a miss: the answer is built as if nothing was cached.
describe('a failing Cache table never fails a shared answer', () => {
  it.each([
    ['premieres', '/premieres'],
    ['feature of the day', `/home/feature?date=${today}`],
    ['toy of the day', `/home/toy?date=${today}`],
    ['new this week', `/home/new-this-week?date=${today}`],
  ])('%s', async (_, path) => {
    const expected = (await request(path)).status;
    db.reset();
    const spy = failCacheReads();

    const response = await request(path);

    expect(response.status).toBe(expected);
    expect(response.status).not.toBe(500);
    spy.mockRestore();
  });

  it('home picks', async () => {
    seedUser();
    const path = '/me/home/because-you-watched';
    const expected = (await request(path, { as: USER_ID })).status;
    const spy = failCacheReads();

    expect((await request(path, { as: USER_ID })).status).toBe(expected);
    spy.mockRestore();
  });
});
