import { login } from '@/app/actions';
import LoginButton from '@/components/Buttons/LoginButton';
import TmdbAuthButton from '@/components/Buttons/TmdbAuthButton';

export default async function LoginPage({
  searchParams: searchParamsFromProps,
}: Readonly<{
  searchParams: Promise<{
    redirectPath?: string;
  }>;
}>) {
  const searchParams = await searchParamsFromProps;
  const redirectPath = decodeURIComponent(searchParams.redirectPath ?? '/');

  return (
    <>
      <form className="mb-4 flex w-full flex-col space-y-4" action={login}>
        <input type="hidden" name="redirectPath" value={redirectPath} />
        <div aria-hidden="true" className="fixed -left-full -top-full">
          <input
            type="email"
            name="backup_email"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <input
          type="email"
          name="email"
          id="email"
          className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          placeholder="Email"
          data-1p-ignore
          required
          autoFocus
        />
        <LoginButton />
      </form>
      <p className="flex items-center justify-center gap-x-1.5 text-xs text-neutral-500">
        Or continue with
        <TmdbAuthButton className="opacity-50" redirectPath={redirectPath} />
      </p>
    </>
  );
}
