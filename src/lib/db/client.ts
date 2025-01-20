import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

if (typeof window !== 'undefined') {
  throw new Error('This module is not meant to run in the browser');
}

const client = new DynamoDBClient({});

export default client;
