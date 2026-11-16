import { Fragment } from 'react';

/**
 * Text with "→" steps. The app's Inter subset has no → (it falls to Arial's
 * wider one); the boards draw it in the system face, so do the same.
 */
export default function ArrowText({ text }: Readonly<{ text: string }>) {
  const parts = text.split('→');
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? <span className="font-[system-ui]">→</span> : null}
      {part}
    </Fragment>
  ));
}
