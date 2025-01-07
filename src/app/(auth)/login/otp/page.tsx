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
  const searchParams = await searchParamsFromProps;
  const redirectPath = decodeURIComponent(searchParams.redirectPath ?? '/');
  const email = searchParams.email;

  if (!email) {
    return redirect(`/login?redirectPath=${encodeURIComponent(redirectPath)}`);
  }

  return <OTPForm email={email} redirectPath={redirectPath} />;
}
