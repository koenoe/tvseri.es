'use client';

import {
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type FocusEvent,
  type ClipboardEvent,
  type ChangeEvent,
  useTransition,
} from 'react';

import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import Logo from '@/components/Logo';

const initialState = ['', '', '', '', '', ''];

const OTPVerification = () => {
  const searchParams = useSearchParams();
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
        const email = searchParams.get('email');
        console.log({
          code,
          email,
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast.error('Invalid code');
        reset();
      });
    },
    [reset, searchParams],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (
        !/^[0-9]{1}$/.test(e.key) &&
        e.key !== 'Backspace' &&
        e.key !== 'Delete' &&
        e.key !== 'Tab' &&
        !e.metaKey
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
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h1 className="mb-8">
          <Logo />
          <span className="sr-only">tvseri.es</span>
        </h1>
        <div className="relative flex w-full justify-between gap-2">
          {otpValues.map((value, index) => (
            <input
              key={index}
              autoFocus={index === 0}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => handleInput(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={handleFocus}
              onPaste={handlePaste}
              className="block size-12 rounded-lg border border-neutral-700 bg-neutral-800 p-0 text-center text-neutral-400 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
              maxLength={1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
