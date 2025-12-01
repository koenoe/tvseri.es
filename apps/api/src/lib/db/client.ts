import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

/**
 * DynamoDB client instance.
 *
 * Note: AWS SDK v3 enables HTTP keep-alive by default, so connection
 * reuse is automatic. No custom configuration needed.
 */
const client = new DynamoDBClient({});

export default client;
