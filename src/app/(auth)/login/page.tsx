import { login } from '@/app/actions';
import LoginButton from '@/components/Buttons/LoginButton';
import TmdbAuthButton from '@/components/Buttons/TmdbAuthButton';
import Logo from '@/components/Logo';

export default async function LoginPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h1 className="mb-8">
          <Logo />
          <span className="sr-only">tvseri.es</span>
        </h1>
        <form className="mb-4 flex w-full flex-col space-y-4" action={login}>
          <input
            type="email"
            name="email"
            id="email"
            className="block w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
            placeholder="Email"
            required
          />
          <LoginButton />
        </form>
        <p className="flex items-center justify-center gap-x-1.5 text-xs text-neutral-500">
          Or continue with
          <TmdbAuthButton className="opacity-50" />
        </p>
      </div>
    </div>
  );
}
