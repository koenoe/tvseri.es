import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { type ChangeEvent, type FormEvent, useId, useRef } from 'react';
import { appearFrom } from '@/components/motion/appear';
import Button from '@/components/ui/button/Button';
import { lockGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import InputShell, { INPUT_CLASS } from '../../_components/InputShell';
import type { UsernameHint } from '../_lib/usernameHint';
import Field from './Field';
import { FORM_CARD } from './profileLayout';

/**
 * Cancel slides in from the Save button's side as the first edit lands, and
 * fades out once the form is back as saved
 */
const CANCEL = appearFrom({ x: 8 });

type Props = Readonly<{
  canSave: boolean;
  changed: boolean;
  email: string;
  hint: UsernameHint;
  name: string;
  onCancel: () => void;
  onName: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUsername: (event: ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
  username: string;
}>;

/** The form card: Name, Username, the read-only Email and the save bar. */
export default function ProfileForm({
  canSave,
  changed,
  email,
  hint,
  name,
  onCancel,
  onName,
  onSubmit,
  onUsername,
  saving,
  username,
}: Props) {
  const ids = useId();
  const nameId = `${ids}-name`;
  const nameHintId = `${ids}-name-hint`;
  const usernameId = `${ids}-username`;
  const usernameHintId = `${ids}-username-hint`;
  const usernameInvalid = hint.tone === 'bad';
  const saveBlocked = !canSave;
  const saveRef = useRef<HTMLButtonElement>(null);
  // Cancel leaves with the edit it undid: Save, which stays (as "Saved"),
  // holds the focus; a held Enter on it submits nothing, there's no change
  const cancel = () => {
    saveRef.current?.focus();
    onCancel();
  };
  return (
    <form className={FORM_CARD} noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-6">
        <Field
          hint="Private. Visitors only see your username."
          hintId={nameHintId}
          id={nameId}
          label="Name"
        >
          <InputShell className="h-12 px-4">
            <input
              aria-describedby={nameHintId}
              autoComplete="name"
              className={INPUT_CLASS}
              id={nameId}
              maxLength={128}
              onChange={onName}
              type="text"
              value={name}
            />
          </InputShell>
        </Field>
        <Field
          hint={hint.message}
          hintId={usernameHintId}
          id={usernameId}
          label="Username"
          tone={hint.tone}
        >
          <InputShell className="h-12 px-4">
            <span className="text-body text-white/60 md:text-body-sm">
              tvseri.es/u/
            </span>
            <input
              aria-describedby={usernameHintId}
              aria-invalid={usernameInvalid}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className={INPUT_CLASS}
              id={usernameId}
              onChange={onUsername}
              spellCheck={false}
              type="text"
              value={username}
            />
          </InputShell>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-semibold text-white">Email</span>
          <span className="flex h-12 items-center gap-2.5 rounded-10 px-4 text-body-sm text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
            <Icon className="size-3.5" glyph={lockGlyph} size={16} />
            {email}
          </span>
          <span className="text-caption text-white/60">
            You sign in with it, so it can’t be changed here.
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-white/6 pt-6">
        <AnimatePresence initial={false}>
          {changed ? <LeavingCancel key="cancel" onCancel={cancel} /> : null}
        </AnimatePresence>
        <Button
          aria-disabled={saveBlocked}
          className="border-0 px-6 aria-disabled:bg-white/18"
          pending={saving}
          ref={saveRef}
          type="submit"
          variant="primary"
        >
          {changed ? 'Save changes' : 'Saved'}
        </Button>
      </div>
    </form>
  );
}

/** Cancel fades out once the form is back to saved; leaving, it can't be pressed */
function LeavingCancel({ onCancel }: Readonly<{ onCancel: () => void }>) {
  const leaving = !useIsPresent();
  return (
    <m.span className="flex" inert={leaving} {...CANCEL}>
      <Button onClick={onCancel} variant="quiet">
        Cancel
      </Button>
    </m.span>
  );
}
