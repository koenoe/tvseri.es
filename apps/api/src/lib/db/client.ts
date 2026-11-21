import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { awsHttpOptions } from '@tvseri.es/constants';
import { createInstrumentedDynamoClient } from '@/lib/metrics/instrumented-dynamo';

/** Every call is recorded as a dependency metric (duration, table, operation) */
const client = createInstrumentedDynamoClient(
  new DynamoDBClient({ requestHandler: awsHttpOptions() }),
);

export default client;
