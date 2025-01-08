'use client';

import { useFormStatus } from 'react-dom';

import LoadingDots from '../LoadingDots/LoadingDots';

export default function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      type="submit"
      className="hover:bg-primary-700 relative flex h-11 w-full items-center justify-center space-x-3 rounded-lg bg-white px-5 py-2.5 text-center text-sm font-medium text-neutral-900 outline-none transition-colors"
    >
      {pending ? <LoadingDots className="h-3 text-neutral-900" /> : 'Sign in'}
    </button>
  );
}
