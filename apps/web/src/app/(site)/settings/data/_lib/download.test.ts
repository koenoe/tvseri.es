import { describe, expect, it } from 'vitest';

import {
  attachmentName,
  csvRowCount,
  downloadErrorText,
  downloadedToast,
} from './download';

describe('attachmentName', () => {
  it('reads the quoted name', () => {
    expect(
      attachmentName(
        'attachment; filename="tvseries-history-2026-11-12.csv"',
        'x.csv',
      ),
    ).toBe('tvseries-history-2026-11-12.csv');
  });

  it('keeps only plain characters and falls back without a header', () => {
    expect(attachmentName('attachment; filename="../../etc/passwd"', 'x')).toBe(
      '....etcpasswd',
    );
    expect(attachmentName(null, 'x.csv')).toBe('x.csv');
    expect(attachmentName('attachment', 'x.csv')).toBe('x.csv');
  });
});

describe('csvRowCount', () => {
  it('counts rows under the header', () => {
    expect(csvRowCount('title,season\nA,1\nB,2\n')).toBe(2);
    expect(csvRowCount('title,season\n')).toBe(0);
    expect(csvRowCount('')).toBe(0);
  });
});

describe('copy', () => {
  it('names the file and the episodes', () => {
    expect(downloadedToast('tvseries-history.csv', 4812)).toBe(
      'Downloaded tvseries-history.csv · 4,812 episodes',
    );
    expect(downloadedToast('tvseries-everything.json')).toBe(
      'Downloaded tvseries-everything.json',
    );
  });

  it('says why a download failed, plainly', () => {
    expect(downloadErrorText(413)).toMatch(/too big/);
    expect(downloadErrorText(401)).toMatch(/Sign in/);
    expect(downloadErrorText(502)).toMatch(/Try again/);
  });
});
