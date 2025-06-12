'use client';

import { useEffect, useTransition } from 'react';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { loginWithTmdb, removeTmdbAccount } from '@/app/actions';
import TmdbLogo from '@/assets/tmdb.svg';
import { type User } from '@/types/user';

import LoadingDots from '../LoadingDots/LoadingDots';

export default function Tmdb({ user }: Readonly<{ user: User }>) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorFromSearchParams = searchParams.get('error');

  const hasTmdbAccount =
    user.tmdbAccountId && user.tmdbAccountObjectId && user.tmdbUsername;

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeTmdbAccount();
      if (result?.message) {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }
      router.refresh();
    });
  };

  const handleAdd = () => {
    startTransition(async () => {
      await loginWithTmdb('/settings/profile');
    });
  };

  useEffect(() => {
    if (errorFromSearchParams) {
      toast.error(
        errorFromSearchParams === 'tmdbAccountAlreadyLinked'
          ? 'Your TMDb account is already linked.'
          : 'An error occurred while linking your TMDb account.',
      );
    }
  }, [errorFromSearchParams]);

  return (
    <div className={twMerge('self-start rounded-lg bg-neutral-800/50 p-8')}>
      {hasTmdbAccount && (
        <div className="mb-8 flex h-[15px] items-center justify-between">
          <Image src={TmdbLogo} alt="TMDb" width={99} height={15} />
          <button
            disabled={isPending}
            className="flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-400 hover:underline"
            onClick={handleRemove}
          >
            {isPending ? (
              <LoadingDots className="h-[12px] text-neutral-400" />
            ) : (
              'Remove'
            )}
          </button>
        </div>
      )}
      {hasTmdbAccount ? (
        <dl className="space-y-6">
          <div>
            <dt className="text-xs font-medium text-neutral-400">Account ID</dt>
            <dd className="mt-1 text-sm text-neutral-200">
              {user.tmdbAccountId}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400">
              Account Object ID
            </dt>
            <dd className="mt-1 text-sm text-neutral-200">
              {user.tmdbAccountObjectId}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400">Username</dt>
            <dd className="mt-1 text-sm text-neutral-200">
              {user.tmdbUsername}
            </dd>
          </div>
        </dl>
      ) : (
        <button
          disabled={isPending}
          onClick={handleAdd}
          className="flex h-12 w-full items-center justify-center gap-x-3 rounded-lg bg-white/10 p-3 text-sm font-medium text-neutral-400 hover:bg-white/15"
        >
          {isPending ? (
            <LoadingDots className="h-[12px] text-neutral-400" />
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 text-white/60"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.975 14.51a1.05 1.05 0 0 0 0-1.485 2.95 2.95 0 0 1 0-4.172l3.536-3.535a2.95 2.95 0 1 1 4.172 4.172l-1.093 1.092a1.05 1.05 0 0 0 1.485 1.485l1.093-1.092a5.05 5.05 0 0 0-7.142-7.142L9.49 7.368a5.05 5.05 0 0 0 0 7.142c.41.41 1.075.41 1.485 0zm2.05-5.02a1.05 1.05 0 0 0 0 1.485 2.95 2.95 0 0 1 0 4.172l-3.5 3.5a2.95 2.95 0 1 1-4.171-4.172l1.025-1.025a1.05 1.05 0 0 0-1.485-1.485L3.87 12.99a5.05 5.05 0 0 0 7.142 7.142l3.5-3.5a5.05 5.05 0 0 0 0-7.142 1.05 1.05 0 0 0-1.485 0z"
                  fill="currentColor"
                />
              </svg>
              <div className="flex flex-nowrap items-center gap-x-2 truncate text-nowrap">
                Link your
                <Image
                  src={TmdbLogo}
                  alt="TMDb"
                  width={80}
                  height={12}
                  className="opacity-60"
                />
                account
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
