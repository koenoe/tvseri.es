'use client';

import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  memo,
  useCallback,
  useRef,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import { loginWithOTP } from '@/app/actions';

const initialState = ['', '', '', '', '', ''];

const OTPForm = ({
  email,
  redirectPath,
}: Readonly<{
  email: string;
  redirectPath: string;
}>) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [otpValues, setOtpValues] = useState<string[]>(initialState);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const reset = useCallback(() => {
    inputRefs.current.forEach((input) => {
      if (input) input.disabled = false;
    });
    setOtpValues(initialState);
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = useCallback(
    (digits: string[]) => {
      inputRefs.current.forEach((input) => {
        if (input) input.disabled = true;
      });

      startTransition(async () => {
        const code = digits.join('');

        try {
          await loginWithOTP({ email, otp: code });
          router.replace(redirectPath);
        } catch (err) {
          const error = err as Error;
          if (error.message === 'InvalidCode') {
            toast.error('Invalid code');
          } else {
            toast.error('An unknown error occurred, please try again');
          }
          reset();
        }
      });
    },
    [email, redirectPath, reset, router],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      // Only prevent default for non-control keys, but allow paste and navigation
      if (
        !/^[0-9]{1}$/.test(e.key) &&
        e.key !== 'Backspace' &&
        e.key !== 'Delete' &&
        e.key !== 'Tab' &&
        e.key !== 'ArrowLeft' &&
        e.key !== 'ArrowRight' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (index > 0 && !otpValues[index]) {
          const newOtpValues = [...otpValues];
          newOtpValues[index - 1] = '';
          setOtpValues(newOtpValues);
          inputRefs.current[index - 1]?.focus();
        }
      }
    },
    [otpValues],
  );

  const handleInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>, index: number) => {
      const value = e.target.value;
      if (/^\d*$/.test(value) && value.length <= 1) {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = value;
        setOtpValues(newOtpValues);

        if (value) {
          if (index < otpValues.length - 1) {
            inputRefs.current[index + 1]?.focus();
          } else if (index === otpValues.length - 1) {
            if (newOtpValues.every((v) => v !== '')) {
              submitCode(newOtpValues);
            }
          }
        }
      }
    },
    [otpValues, submitCode],
  );

  const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!new RegExp(`^[0-9]{${otpValues.length}}$`).test(text)) {
        return;
      }
      const digits = text.split('');
      setOtpValues(digits);
      inputRefs.current[otpValues.length - 1]?.focus();
      submitCode(digits);
    },
    [otpValues.length, submitCode],
  );

  return (
    <div className="relative flex w-full justify-between gap-2">
      {otpValues.map((value, index) => (
        <input
          aria-label={`Digit ${index + 1} of verification code`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={index === 0}
          className="block size-12 rounded-lg border border-neutral-700 bg-neutral-800 p-0 text-center text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
          data-1p-ignore
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(e) => handleInput(e, index)}
          onFocus={handleFocus}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          pattern="[0-9]*"
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          value={value}
        />
      ))}
    </div>
  );
};

export default memo(OTPForm);
