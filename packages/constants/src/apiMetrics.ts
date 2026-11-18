/**
 * Share of API requests whose metrics are recorded (10%, to keep SQS costs
 * down). The daily aggregation scales counts back up by its inverse.
 */
export const API_METRICS_SAMPLE_RATE = 0.1;
