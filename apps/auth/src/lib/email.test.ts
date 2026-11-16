import type { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as SendEmailCommand[]);
vi.mock('@aws-sdk/client-sesv2', async (original) => ({
  ...(await original<typeof import('@aws-sdk/client-sesv2')>()),
  SESv2Client: class {
    send(command: SendEmailCommand) {
      sent.push(command);
      return Promise.resolve({});
    }
  },
}));

import { renderCodeEmail } from './codeEmail';
import { CODE_TTL } from './codeLifetime';
import { sendEmail } from './email';

describe('sendEmail', () => {
  it('sends the code email as a text part and an HTML part, UTF-8, from auth@', async () => {
    const message = renderCodeEmail({ code: '482913', ttl: CODE_TTL });
    await sendEmail({
      ...message,
      recipient: 'ana@example.com',
      sender: 'auth', // as index.ts sends it
    });

    const input = sent.at(-1)?.input;
    expect(input?.FromEmailAddress).toBe('tvseri.es <auth@example.com>');
    expect(input?.Destination?.ToAddresses).toEqual(['ana@example.com']);
    expect(input?.Content?.Simple).toEqual({
      Body: {
        Html: { Charset: 'UTF-8', Data: message.html },
        Text: { Charset: 'UTF-8', Data: message.text },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Your tvseri.es sign-in code: 482913',
      },
    });
  });
});
