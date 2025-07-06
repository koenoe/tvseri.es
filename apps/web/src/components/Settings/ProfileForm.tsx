'use client';

import type { User } from '@tvseri.es/types';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import { updateProfile } from '@/app/actions';
import LoadingDots from '../LoadingDots/LoadingDots';
import Tmdb from './Tmdb';

const initialState = {
  message: '',
  success: false,
};

export default function ProfileForm({
  user,
}: Readonly<{
  user: User;
}>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (state: typeof initialState, formData: FormData) => {
      const result = await updateProfile(state, formData);
      router.refresh();
      return result;
    },
    initialState,
  );

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-lg bg-neutral-800/50 p-8 lg:col-span-2">
        <form action={formAction} className="flex w-full flex-col gap-y-6">
          <div className="space-y-3">
            <label
              className="block text-sm font-medium text-neutral-200"
              htmlFor="name"
            >
              Name
            </label>
            <input
              className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              data-1p-ignore
              defaultValue={user.name ?? ''}
              id="name"
              name="name"
              placeholder="Name"
              type="text"
            />
          </div>

          <div className="space-y-3">
            <label
              className="block text-sm font-medium text-neutral-200"
              htmlFor="username"
            >
              Username
            </label>
            <input
              className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              data-1p-ignore
              defaultValue={user.username}
              id="username"
              name="username"
              placeholder="Username"
              required
              type="text"
            />
          </div>

          <div className="space-y-3">
            <label
              className="block text-sm font-medium text-neutral-200"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              data-1p-ignore
              defaultValue={user.email ?? ''}
              id="email"
              name="email"
              placeholder="Email"
              required={!!user.email}
              type="email"
            />
          </div>

          <button
            className="relative flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 py-2.5 text-center text-sm font-medium text-neutral-900 outline-none lg:max-w-48"
            disabled={pending}
            type="submit"
          >
            {pending ? (
              <LoadingDots className="h-3 text-neutral-900" />
            ) : (
              'Update'
            )}
          </button>
        </form>
      </div>

      <Tmdb user={user} />
    </div>
  );
}
