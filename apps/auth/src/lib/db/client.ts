import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { awsHttpOptions } from '@tvseri.es/constants';

const client = new DynamoDBClient({ requestHandler: awsHttpOptions() });

export default client;
