import { FakeDynamo } from './fakeDynamo';
import { TABLES } from './tables';

/** The in-memory DynamoDB behind `@/lib/db/client` in every test */
export const db = new FakeDynamo(TABLES);

/** Messages sent to SQS (any queue) */
export const sqsMessages: Array<
  Readonly<{ queueUrl: string; body: unknown; delaySeconds?: number }>
> = [];
