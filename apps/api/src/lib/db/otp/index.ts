import { randomInt } from 'node:crypto';
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { encodeToBase64Url } from '@tvseri.es/utils';
import { Resource } from 'sst';
import client from '../client';

const OTP_DURATION = 15 * 60; // 15 minutes in seconds

const generateOTP = () => {
  return randomInt(100000, 999999).toString();
};

export const createOTP = async (
  input: Readonly<{
    email: string;
  }>,
): Promise<string> => {
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + OTP_DURATION;
  const code = generateOTP();

  const command = new PutItemCommand({
    Item: marshall({
      code,
      createdAt: now,
      email: input.email.toLowerCase(),
      expiresAt,
      pk: `EMAIL#${encodeToBase64Url(input.email)}`,
      sk: `CODE#${code}`,
    }),
    TableName: Resource.OTP.name,
  });

  try {
    await client.send(command);
    return code;
  } catch (_error) {
    throw new Error('Failed to create OTP');
  }
};

export const validateOTP = async (
  input: Readonly<{
    email: string;
    otp: string;
  }>,
): Promise<boolean> => {
  const command = new GetItemCommand({
    Key: marshall({
      pk: `EMAIL#${encodeToBase64Url(input.email)}`,
      sk: `CODE#${input.otp}`,
    }),
    TableName: Resource.OTP.name,
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return false;
    }

    const otp = unmarshall(result.Item);
    const isValid = otp.expiresAt > Math.floor(Date.now() / 1000);

    if (isValid) {
      await deleteOTP(input.email, input.otp);
    }

    return isValid;
  } catch (_error) {
    throw new Error('Failed to validate OTP');
  }
};

const deleteOTP = async (email: string, code: string): Promise<void> => {
  const command = new DeleteItemCommand({
    Key: marshall({
      pk: `EMAIL#${email.toLowerCase()}`,
      sk: `CODE#${code}`,
    }),
    TableName: Resource.OTP.name,
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error('Failed to delete OTP');
  }
};
