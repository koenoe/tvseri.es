import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { awsHttpOptions } from '@tvseri.es/constants';
import { Resource } from 'sst';

// Bound the time the request path waits for the DominantColor Lambda: one
// attempt (a timeout would otherwise be retried as transient). 8s leaves room
// for a cold start (sharp + image fetch) and stays under the API's 14s timeout.
const lambda = new LambdaClient({
  maxAttempts: 1,
  requestHandler: awsHttpOptions(8_000),
});

/**
 * Runs the image Lambda (`DominantColor`: sharp on one image URL) in one
 * of its modes and returns its parsed answer, for the caller to validate.
 * Throws when the function itself errors.
 */
export async function invokeImageLambda(
  payload: Readonly<{ mode?: 'color' | 'logo'; url: string }>,
): Promise<unknown> {
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: Resource.DominantColor.name,
      Payload: JSON.stringify(payload),
    }),
  );

  // Invoke doesn't throw when the function itself errors
  if (response.FunctionError || !response.Payload) {
    throw new Error(
      `DominantColor Lambda failed: ${response.FunctionError ?? 'empty payload'}`,
    );
  }

  return JSON.parse(Buffer.from(response.Payload).toString());
}
