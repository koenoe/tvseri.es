import { randomInt } from 'crypto';

import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import client from '../client';
import { encodeToBase64Url } from '@/utils/stringBase64Url';

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
    TableName: Resource.OTP.name,
    Item: marshall({
      pk: `EMAIL#${encodeToBase64Url(input.email)}`,
      sk: `CODE#${code}`,
      email: input.email.toLowerCase(),
      createdAt: now,
      expiresAt,
      code,
    }),
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
    TableName: Resource.OTP.name,
    Key: marshall({
      pk: `EMAIL#${encodeToBase64Url(input.email)}`,
      sk: `CODE#${input.otp}`,
    }),
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

export const deleteOTP = async (email: string, code: string): Promise<void> => {
  const command = new DeleteItemCommand({
    TableName: Resource.OTP.name,
    Key: marshall({
      pk: `EMAIL#${email.toLowerCase()}`,
      sk: `CODE#${code}`,
    }),
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error('Failed to delete OTP');
  }
};
