/** @jsxImportSource hono/jsx */

import type { PropsWithChildren } from 'hono/jsx';

import css from './ui.css';

export function Layout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>tvseri.es</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <div data-component="root">
          <div data-component="center">
            <a data-component="logo" href="/">
              <svg
                fill="none"
                viewBox="4 4 16 16.88"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clip-rule="evenodd"
                  d="M8 6.11861L9.4131 4.70551L11.5371 6.82954L14.3667 4L15.7782 5.41151L13.3137 7.87598H18C19.1046 7.87598 20 8.77141 20 9.87598V16.876C20 17.9805 19.1046 18.876 18 18.876H6C4.89543 18.876 4 17.9805 4 16.876V9.87598C4 8.77141 4.89543 7.87598 6 7.87598H9.75736L8 6.11861ZM18 9.87598H6V16.876H18V9.87598Z"
                  fill="#fff"
                  fill-rule="evenodd"
                ></path>
                <path d="M8 19.876H16V20.876H8V19.876Z" fill="#fff"></path>
              </svg>
              <span>tvseri.es</span>
            </a>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
