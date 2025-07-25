import { decryptToken } from '@tvseri.es/token';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import OTPForm from '@/components/OTP/Form';

export default async function OTPPage({
  searchParams: searchParamsFromProps,
}: Readonly<{
  searchParams: Promise<{
    redirectPath?: string;
    email: string;
  }>;
}>) {
  const [searchParams, cookieStore] = await Promise.all([
    searchParamsFromProps,
    cookies(),
  ]);
  const redirectPath = decodeURIComponent(searchParams.redirectPath ?? '/');
  const encryptedEmail = cookieStore.get('emailOTP')?.value;

  if (!encryptedEmail) {
    return redirect(`/login?redirectPath=${encodeURIComponent(redirectPath)}`);
  }

  const email = decryptToken(encryptedEmail);

  return <OTPForm email={email} redirectPath={redirectPath} />;
}
