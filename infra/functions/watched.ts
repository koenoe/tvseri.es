// Note: just leave this here for future reference
// this function is not used in the project

// import { type DynamoDBStreamEvent } from 'aws-lambda';

// import {
//   DynamoDBClient,
//   PutItemCommand,
//   QueryCommand,
//   DeleteItemCommand,
//   type AttributeValue,
// } from '@aws-sdk/client-dynamodb';
// import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
// import { Resource } from 'sst';

// const client = new DynamoDBClient();

// export const handler = async (event: DynamoDBStreamEvent) => {
//   for (const record of event.Records) {
//     if (!record.dynamodb?.NewImage && !record.dynamodb?.OldImage) {
//       console.error(
//         'Missing dynamodb image data in record:',
//         JSON.stringify(record),
//       );
//       continue;
//     }

//     if (record.eventName === 'INSERT' && record.dynamodb.NewImage) {
//       const newImage = record.dynamodb.NewImage as Record<
//         string,
//         AttributeValue
//       >;
//       const newItem = unmarshall(newImage) as WatchedItem;

//       try {
//         const command = new PutItemCommand({
//           TableName: Resource.Lists.name,
//           Item: marshall({
//             pk: `USER#${newItem.userId}`,
//             sk: `LIST#WATCHED#ITEM#${newItem.seriesId}`,
//             id: newItem.seriesId,
//             title: newItem.title,
//             slug: newItem.slug,
//             posterImage: newItem.posterImage,
//             createdAt: newItem.watchedAt,
//             gsi1pk: `LIST#${newItem.userId}#WATCHED`,
//             gsi1sk: newItem.title.toLowerCase(),
//             gsi2pk: `LIST#${newItem.userId}#WATCHED`,
//             gsi2sk: newItem.watchedAt,
//           }),
//         });

//         await client.send(command);
//       } catch (error: unknown) {
//         console.error(
//           `Failed to add series ${newItem.seriesId} to watched list:`,
//           error instanceof Error ? error.message : error,
//         );
//       }
//     }

//     if (record.eventName === 'REMOVE' && record.dynamodb.OldImage) {
//       const oldImage = record.dynamodb.OldImage as Record<
//         string,
//         AttributeValue
//       >;
//       const oldItem = unmarshall(oldImage) as WatchedItem;

//       try {
//         const command = new QueryCommand({
//           TableName: Resource.Watched.name,
//           IndexName: 'gsi1',
//           KeyConditionExpression: 'gsi1pk = :pk',
//           ExpressionAttributeValues: marshall({
//             ':pk': `USER#${oldItem.userId}#SERIES#${oldItem.seriesId}`,
//           }),
//           Select: 'COUNT',
//         });

//         const remaining = await client.send(command);

//         if (!remaining.Count) {
//           const deleteCommand = new DeleteItemCommand({
//             TableName: Resource.Lists.name,
//             Key: marshall({
//               pk: `USER#${oldItem.userId}`,
//               sk: `LIST#WATCHED#ITEM#${oldItem.seriesId}`,
//             }),
//           });

//           await client.send(deleteCommand);
//         }
//       } catch (error: unknown) {
//         console.error(
//           `Failed to process removal of series ${oldItem.seriesId} from watched list:`,
//           error instanceof Error ? error.message : error,
//         );
//       }
//     }
//   }
// };
