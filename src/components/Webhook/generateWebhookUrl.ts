export default function generateWebhookUrl({
  token,
  type,
}: Readonly<{
  token: string;
  type: string;
}>) {
  return `${process.env.SITE_URL}/api/webhooks/scrobble/${type}?token=${token}`;
}
