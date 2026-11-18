/**
 * The WebhookTokens table's keys: one item per webhook (`TOKEN#<value>`), and
 * gsi1 finds a user's webhooks for one provider (`USER#<userId>#TYPE#<type>`).
 * Never change a format: stored items keep the one they were written with.
 */
export const webhookPk = (value: string) => `TOKEN#${value}`;

/** gsi1: a user's webhooks for one provider */
export const userTypeIndexPk = (userId: string, type: string) =>
  `USER#${userId}#TYPE#${type}`;
