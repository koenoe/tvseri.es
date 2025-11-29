export default function BackgroundGlobalBase({
  color,
  enableTransitions = false,
}: Readonly<{
  color: string;
  enableTransitions?: boolean;
}>) {
  const transitionStyles = enableTransitions
    ? `
          body,
          main,
          main + div,
          footer {
            transition-property: background-color;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 500ms;
          }
        `
    : '';

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: ignore
      dangerouslySetInnerHTML={{
        __html: `
          :root { --main-background-color: ${color}; }
          body,
          main,
          main + div,
          footer {
            background-color: var(--main-background-color) !important;
          }
          ${transitionStyles}
        `,
      }}
    />
  );
}
