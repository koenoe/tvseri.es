import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Resource } from 'sst';

const client = new SESv2Client();

// TODO: should become an api call to api.tvseri.es
// api should then send the email

export const sendEmail = async ({
  sender,
  recipient,
  subject,
  body,
}: Readonly<{
  sender?: string;
  recipient: string | string[];
  subject: string;
  body: string;
}>) => {
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: `tvseri.es <${sender ?? 'no-reply'}@${Resource.Email.sender}>`,
      Destination: {
        ToAddresses: typeof recipient === 'string' ? [recipient] : recipient,
      },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: body },
            Text: { Data: body.replace(/<[^>]*>/g, '') },
          },
        },
      },
    }),
  );
};
