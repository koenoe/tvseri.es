import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Resource } from 'sst';

const client = new SESv2Client();

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
      Content: {
        Simple: {
          Body: {
            Html: { Data: body },
            Text: { Data: body.replace(/<[^>]*>/g, '') },
          },
          Subject: { Data: subject },
        },
      },
      Destination: {
        ToAddresses: typeof recipient === 'string' ? [recipient] : recipient,
      },
      FromEmailAddress: `tvseri.es <${sender ?? 'no-reply'}@${Resource.Email.sender}>`,
    }),
  );
};
