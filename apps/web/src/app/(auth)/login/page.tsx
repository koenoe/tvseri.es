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
      <form action={login} className="mb-4 flex w-full flex-col space-y-4">
        <input name="redirectPath" type="hidden" value={redirectPath} />
        <div aria-hidden="true" className="fixed -left-full -top-full">
          <input
            autoComplete="off"
            name="verify_email"
            tabIndex={-1}
            type="email"
          />
        </div>
        <input
          autoFocus
          className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          data-1p-ignore
          id="email"
          name="email"
          placeholder="Email"
          required
          type="email"
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
