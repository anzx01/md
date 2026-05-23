# Third-Party Notices

This project is distributed under the MIT license. It also depends on third-party open-source software and bundled font files with their own licenses.

## npm Dependencies

Run the current dependency license report with:

```bash
pnpm run audit:licenses
```

The production dependency scan performed on 2026-05-23 found these license families:

- MIT
- Apache-2.0
- Apache-2.0 AND LGPL-3.0-or-later
- BSD-3-Clause
- ISC
- 0BSD
- Unlicense
- CC-BY-4.0

The `Apache-2.0 AND LGPL-3.0-or-later` entry comes from the optional platform package `@img/sharp-win32-x64`, pulled through the Next.js image processing stack. If you redistribute bundled binaries or packaged runtime artifacts, keep the upstream notices and license terms with the distribution.

## Bundled Fonts

The following files are bundled with the application:

- `src/app/fonts/GeistVF.woff`
- `src/app/fonts/GeistMonoVF.woff`

Geist is licensed under the SIL Open Font License, Version 1.1. See `LICENSES/OFL-1.1-Geist.txt`.
