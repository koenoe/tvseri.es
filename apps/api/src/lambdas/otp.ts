import { type DynamoDBStreamEvent } from 'aws-lambda';

import { type AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { sendEmail } from '@/lib/email';

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (!record.dynamodb?.NewImage || record.eventName !== 'INSERT') {
      continue;
    }

    const image = record.dynamodb.NewImage;
    const otpItem = unmarshall(image as Record<string, AttributeValue>);

    if (!otpItem.email || !otpItem.code) {
      console.warn('Missing email or code in OTP item:', otpItem);
      continue;
    }

    await sendEmail({
      recipient: otpItem.email,
      sender: 'auth',
      subject: `Your OTP: ${otpItem.code}`,
      body: `Your OTP is <strong>${otpItem.code}</strong>`,
    });
  }
};
