'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useState,
  useTransition,
} from 'react';

import { showToast } from '@/components/ui/toast/showToast';

import { updateProfile } from '../../_actions/profile';
import { SAVE_FAILED } from '../../_lib/saveFailed';
import { type UsernameHint, usernameHint } from '../_lib/usernameHint';
import { useUsernameAvailability } from '../_lib/useUsernameAvailability';
import ProfileForm from './ProfileForm';
import ProfilePreview, {
  type PreviewData,
  PreviewFoot,
} from './ProfilePreview';

type Values = Readonly<{ name: string; username: string }>;

/**
 * The Profile section: the form and its live preview share one draft, so the
 * preview's handle and link follow the Username field as you type. Saving is a
 * server action (only the changed fields are sent); the toast offers Undo,
 * which saves the previous values back.
 */
export default function ProfileEditor({
  email,
  initial,
  preview,
}: Readonly<{ email: string; initial: Values; preview: PreviewData }>) {
  const [saved, setSaved] = useState<Values>(initial);
  const [draft, setDraft] = useState<Values>(initial);
  const [saving, startSaving] = useTransition();
  const { forDraft, markTaken, onDraft } = useUsernameAvailability(
    saved.username,
  );

  const hint: UsernameHint = usernameHint({
    availability: forDraft(draft.username),
    draft: draft.username,
    saved: saved.username,
  });
  const changed =
    draft.name !== saved.name || draft.username !== saved.username;
  const canSave = changed && hint.canSave && !saving;

  const onName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setDraft((current) => ({ ...current, name }));
  }, []);

  const onUsername = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const username = event.target.value;
      setDraft((current) => ({ ...current, username }));
      onDraft(username);
    },
    [onDraft],
  );

  const onCancel = useCallback(() => setDraft(saved), [saved]);

  const persist = useCallback(
    (values: Values, onSaved: (values: Values) => void) => {
      startSaving(async () => {
        const result = await updateProfile(values);
        if (result.ok) {
          onSaved(result.data);
        } else if (result.error === 'taken') {
          markTaken(values.username);
        } else {
          showToast({ title: SAVE_FAILED, tone: 'error' });
        }
      });
    },
    [markTaken],
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSave) {
        return;
      }
      const before = saved;
      persist(draft, (values) => {
        setSaved(values);
        setDraft(values);
        showToast({
          action: {
            label: 'Undo',
            onClick: () =>
              persist(before, (restored) => {
                setSaved(restored);
                setDraft(restored);
              }),
          },
          title: 'Profile saved',
        });
      });
    },
    [canSave, draft, persist, saved],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_348px]">
      <ProfileForm
        canSave={canSave}
        changed={changed}
        email={email}
        hint={hint}
        name={draft.name}
        onCancel={onCancel}
        onName={onName}
        onSubmit={onSubmit}
        onUsername={onUsername}
        saving={saving}
        username={draft.username}
      />
      <div className="flex flex-col gap-3 max-lg:order-first">
        <ProfilePreview data={preview} username={draft.username} />
        <PreviewFoot username={draft.username} />
      </div>
    </div>
  );
}
