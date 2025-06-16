'use client';

import { useActionState, useEffect } from 'react';

import { type User } from '@tvseri.es/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateProfile } from '@/app/actions';

import Tmdb from './Tmdb';
import LoadingDots from '../LoadingDots/LoadingDots';

const initialState = {
  message: '',
  success: false,
};

export default function ProfileSection({
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
        <form className="flex w-full flex-col gap-y-6" action={formAction}>
          <div className="space-y-3">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-neutral-200"
            >
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={user.name ?? ''}
              className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              placeholder="Name"
              data-1p-ignore
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-neutral-200"
            >
              Username
            </label>
            <input
              type="text"
              name="username"
              id="username"
              defaultValue={user.username}
              className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              placeholder="Username"
              required
              data-1p-ignore
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-200"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              defaultValue={user.email ?? ''}
              className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              placeholder="Email"
              data-1p-ignore
              required={user.email ? true : false}
            />
          </div>

          <button
            disabled={pending}
            type="submit"
            className="relative flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 py-2.5 text-center text-sm font-medium text-neutral-900 outline-none lg:max-w-48"
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
