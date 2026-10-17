import Link from 'next/link';

import LoginButton from '@/components/Auth/LoginButton';

export default function Unauthorized() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-bold">Login required</h1>
      <p className="text-white/60">Please log in to view this page.</p>
      <LoginButton />
      <Link className="text-sm text-white/60 underline" href="/">
        Go to the homepage
      </Link>
    </main>
  );
}
