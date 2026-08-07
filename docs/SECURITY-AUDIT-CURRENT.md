# گزارش فعلی npm audit — Launch 3

- Critical: 0
- High: 7
- Moderate: 7
- Low: 1
- Total: 15

| Package | Severity | Direct | Range | Fix available | Via |
| --- | --- | --- | --- | --- | --- |
| brace-expansion | high | no | <=1.1.17 \|\| 3.0.0 - 5.0.8 | yes | 1123897:brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups<br>1123898:brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups<br>1130588:brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash<br>1130591:brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash<br>1130734:brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation<br>1130737:brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation |
| fast-uri | high | no | 3.0.0 - 3.1.4 | yes | 1124064:fast-uri vulnerable to host confusion via literal backslash authority delimiter<br>1130720:fast-uri vulnerable to host confusion via backslash authority introducer<br>1138395:fast-uri vulnerable to host confusion via failed IDN canonicalization |
| js-yaml | high | no | 4.0.0 - 4.3.0 | yes | 1121860:JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases<br>1123911:js-yaml: YAML merge-key chains can force quadratic CPU consumption<br>1138115:JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported |
| next | high | yes | 9.3.4-canary.0 - 16.3.0-preview.10 | next@16.3.0 | postcss<br>sharp |
| postcss | high | no | <=8.5.22 | next@16.3.0 | 1117015:PostCSS has XSS via Unescaped </style> in its CSS Stringify Output<br>1124252:PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments<br>1124288:PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure<br>1130709:PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset |
| sharp | high | no | <0.35.0 | next@16.3.0 | 1124066:sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| undici | high | no | 7.0.0 - 7.28.0 | @cloudflare/vite-plugin@1.51.1 | 1130715:undici vulnerable to downstream response desynchronization via retry interceptor<br>1130718:undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives<br>1130726:undici vulnerable to CRLF Injection via blob-like body 'type' property<br>1130729:undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives<br>1130731:undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields |
| @cloudflare/vite-plugin | moderate | yes | <=0.0.0-fff677e35 \|\| 1.13.0 - 1.51.0 | @cloudflare/vite-plugin@1.51.1 | miniflare<br>wrangler |
| @esbuild-kit/core-utils | moderate | no | * | drizzle-kit@0.18.1 (major) | esbuild |
| @esbuild-kit/esm-loader | moderate | no | * | drizzle-kit@0.18.1 (major) | @esbuild-kit/core-utils |
| drizzle-kit | moderate | yes | 0.19.0 - 1.0.0-beta.1-fd8bfcc | drizzle-kit@0.18.1 (major) | @esbuild-kit/esm-loader |
| esbuild | moderate | no | <=0.24.2 | drizzle-kit@0.18.1 (major) | 1102341:esbuild enables any website to send any requests to the development server and read the response |
| miniflare | moderate | no | 4.20250906.1 - 5.20260801.0-alpha | @cloudflare/vite-plugin@1.51.1 | undici |
| wrangler | moderate | yes | <=0.0.0-31bfd374c \|\| 4.36.0 - 4.119.0 | @cloudflare/vite-plugin@1.51.1 | miniflare |
| @babel/core | low | no | <=7.29.0 | yes | 1123528:@babel/core: Arbitrary File Read via sourceMappingURL Comment |

این فایل فقط inventory است. هیچ `npm audit fix --force` اجرا نشده است.
