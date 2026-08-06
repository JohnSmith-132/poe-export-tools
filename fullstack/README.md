# fullstack

Small Bun fullstack app to extract attachment URLs from Poe share links and Poe chat export files.

## How it works

- `/` serves a minimal UI where you paste a Poe share URL and press Enter, or upload a Poe chat export `.json` or `.md` file.
- `/api/share?url=...` fetches the share HTML and extracts attachment URLs from `__NEXT_DATA__`.
- The browser downloads attachments directly and builds a zip locally with client-zip.

To install dependencies:

```bash
bun install --production
```

To run locally:

```bash
bun run server.ts
```

Open `http://localhost:3000`.

To build a standalone executable:

```bash
bun run build.ts
```

To run:

```bash
./fullstack
```

railway env:
```
RAILPACK_BUILD_CMD="bun run build.ts"
RAILPACK_START_CMD="./fullstack"
RAILPACK_INSTALL_CMD="bun install --production"
RAILPACK_PACKAGES="bun@latest"
```
!TODO: in build.ts, programatically adjust "version" to git commit id, so we dont have to manually change.
