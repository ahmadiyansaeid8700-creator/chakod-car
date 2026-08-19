# Remaining dependency audit details

- critical: 0
- high: 1
- moderate: 7
- low: 0

| Package | Severity | Direct | Vulnerable range | Fix available | Via |
|---|---|---|---|---|---|
| undici | high | transitive | 7.0.0 - 7.28.0 | @cloudflare/vite-plugin@1.51.1 | undici vulnerable to downstream response desynchronization via retry interceptor (https://github.com/advisories/GHSA-8xcm-r25x-g524); undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives (https://github.com/advisories/GHSA-4cwx-7wf7-3272); undici vulnerable to CRLF Injection via blob-like body 'type' property (https://github.com/advisories/GHSA-m8rv-5g2x-5cg5); undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives (https://github.com/advisories/GHSA-jr45-8vmc-qm54); undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields (https://github.com/advisories/GHSA-v3r7-h72x-cjcm) |
| @cloudflare/vite-plugin | moderate | direct | <=0.0.0-fff677e35 \|\| 1.13.0 - 1.51.0 | @cloudflare/vite-plugin@1.51.1 | miniflare; wrangler |
| @esbuild-kit/core-utils | moderate | transitive | * | drizzle-kit@0.18.1 (major) | esbuild |
| @esbuild-kit/esm-loader | moderate | transitive | * | drizzle-kit@0.18.1 (major) | @esbuild-kit/core-utils |
| drizzle-kit | moderate | direct | 0.19.0 - 1.0.0-beta.1-fd8bfcc | drizzle-kit@0.18.1 (major) | @esbuild-kit/esm-loader |
| esbuild | moderate | transitive | <=0.24.2 | drizzle-kit@0.18.1 (major) | esbuild enables any website to send any requests to the development server and read the response (https://github.com/advisories/GHSA-67mh-4wv8-2f99) |
| miniflare | moderate | transitive | 4.20250906.1 - 5.20260801.0-alpha | @cloudflare/vite-plugin@1.51.1 | undici |
| wrangler | moderate | direct | <=0.0.0-31bfd374c \|\| 4.36.0 - 4.119.0 | @cloudflare/vite-plugin@1.51.1 | miniflare |

No `npm audit fix --force` was executed by this workflow.
