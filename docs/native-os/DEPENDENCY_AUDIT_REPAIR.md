# Dependency audit repair before native OS stack merge

The Guardian run for PR #109 (34692613984) failed at `bun audit` with 10 advisories.
The native OS implementation did not modify these inherited JavaScript dependencies.
This repair is applied to the root of the stack so its normal CI can validate the dependency changes before merge.

| Dependency | Previous | Fixed lockfile version |
| --- | --- | --- |
| @ai-sdk/provider-utils | 4.0.30 | 4.0.33 |
| deepmerge-ts | 7.1.5 | 8.0.2 |
| nanoid | 5.1.15 / 3.3.16 | 5.1.16 / 3.3.18 |
| nodemailer | 9.0.1 | 9.1.1 |
| sanitize-html | 2.17.5 | 2.17.7 |

Provider-utils and deepmerge-ts use explicit overrides because their upstream parents pin vulnerable versions.
The deepmerge-ts major update retains CommonJS exports; Prisma schema validation and client generation passed.
Nodemailer and sanitize-html minimum supported versions are raised in the server manifest.
Both nanoid major lines are retained. Sanitize-html's parser dependencies and provider-utils' provider dependency
are resolved by Bun and recorded with registry integrity hashes. No audit exceptions or CI gates are removed.

Advisory references: [provider-utils](https://github.com/advisories/GHSA-866g-f22w-33x8),
[deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx),
[nodemailer](https://github.com/advisories/GHSA-8m3c-c648-2xjj),
[sanitize-html](https://github.com/advisories/GHSA-g8qq-57p8-ggw5).

Local verification on 2026-09-13 (Windows, Bun 1.3.14):

- Frozen lockfile install with lifecycle scripts disabled; reviewed Prisma generation was run explicitly afterward.
- `bun audit`: no vulnerabilities found.
- Dependency alignment and Biome passed.
- Prisma schema validation and client generation passed; no database migrations or writes were performed.
- TypeScript typecheck passed.
- Bun tests: 259 passed, 60 skipped, 0 failed (319 tests across 48 files).
- Server bundle build passed (1177 modules); output remained a temporary local validation file.

Skipped integration tests are not claimed as verified. GitHub CI must complete on the repaired commit before merge.
This repair changes manifests/lockfile and this record only; kernel sources, host settings and deployment settings are untouched.
