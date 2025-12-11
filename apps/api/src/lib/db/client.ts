import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { createInstrumentedDynamoClient } from '@/lib/metrics/instrumented-dynamo';

/**
 * DynamoDB client instance with metrics instrumentation.
 *
 * All operations are automatically tracked for performance monitoring,
 * recording duration, table name, and operation type.
 *
 * Note: AWS SDK v3 enables HTTP keep-alive by default, so connection
 * reuse is automatic. No custom configuration needed.
 */
const client = createInstrumentedDynamoClient(new DynamoDBClient({}));

export default client;
