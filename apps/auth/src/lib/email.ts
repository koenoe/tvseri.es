import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Resource } from 'sst';

const client = new SESv2Client();

// Without a charset SES treats the content as 7-bit ASCII; the copy has
// typographic quotes and a middle dot.
const CHARSET = 'UTF-8';

/**
 * Sends one message through SES v2 `Simple` content: SES builds the MIME
 * (`multipart/alternative`, the text part first, then the HTML part). From
 * `tvseri.es <no-reply@…>` unless a sender is given (the code email: `auth`).
 */
export const sendEmail = async ({
  html,
  recipient,
  sender,
  subject,
  text,
}: Readonly<{
  html: string;
  recipient: string;
  sender?: string;
  subject: string;
  text: string;
}>) => {
  await client.send(
    new SendEmailCommand({
      Content: {
        Simple: {
          Body: {
            Html: { Charset: CHARSET, Data: html },
            Text: { Charset: CHARSET, Data: text },
          },
          Subject: { Charset: CHARSET, Data: subject },
        },
      },
      Destination: { ToAddresses: [recipient] },
      FromEmailAddress: `tvseri.es <${sender ?? 'no-reply'}@${Resource.AuthEmail.sender}>`,
    }),
  );
};
