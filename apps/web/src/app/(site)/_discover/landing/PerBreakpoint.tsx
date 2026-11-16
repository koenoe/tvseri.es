/**
 * Copy the design writes one way on desktop and another on a phone
 * ("New from the UK", "That’s the United Kingdom"): both in the markup, one hidden per breakpoint, so it needs no
 * client JS. Just `desktop` when there is no phone wording.
 */
export default function PerBreakpoint({
  desktop,
  phone,
}: Readonly<{ desktop: string; phone?: string }>) {
  if (!phone || phone === desktop) {
    return desktop;
  }
  return (
    <>
      <span className="max-md:hidden">{desktop}</span>
      <span className="md:hidden">{phone}</span>
    </>
  );
}
