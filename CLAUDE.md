# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Repository layout

Two sub-projects, independent:

- **`fullstack/`** — active. A Bun web app (`export.tools`) that loads Poe chat export files, extracts attachment URLs, and builds a zip client-side. The primary user flow is: tag `@export-chat`, `@savechats`, or `@SaveThisChat` in a Poe conversation, download the returned transcript, then upload that file into `export.tools`.
- **`legacy/`** — dormant. Original upstream Selenium-based Python tools. Don't modify unless the user explicitly asks.

Default to working inside `fullstack/`.

## fullstack/ architecture

- **`server.ts`** — Bun HTTP server. Static routes + `/api/share` fallback endpoint that fetches Poe HTML and extracts `__NEXT_DATA__` via `HTMLRewriter`.
- **`app.ts`** — Vanilla TypeScript frontend. Handles UI, calls `/api/share`, renders grid/chat views, and generates zips via `client-zip`.
- **`chat-data.ts`** — Shared frontend parser for uploaded `.md` transcripts, Poe `next-data.json`, and compact JSON export shapes.
- **`chat-data.test.ts`** — Bun tests for supported upload shapes and Markdown media extraction.
- **`build.ts`** — Bun `compile` into a single executable (`./fullstack`).
- **`static/`** — CSS, icons, OG image. Served from `embeddedFiles` (compiled) or disk (dev).

## Gotchas

- **Railway build target.** `build.ts` compiles to `bun-linux-x64`. For local dev on Apple Silicon, flip `target` to `bun-darwin-arm64-modern` before running `bun run build.ts` — don't commit that change.
- **Manual `VERSION` string.** `build.ts` hardcodes it (`"1.3.17"` in source, last released tag `1.3.19`). Open TODO to derive from git; bump by hand on release.
- **Hash-tolerant static routing.** `server.ts` strips Bun's content-hash suffix (`foo-abc123.png` → `foo.png`) so routes work identically from `embeddedFiles` or disk. Reference assets by their un-hashed name.
- **Bot transcript uploads are primary.** The landing copy, metadata, and UX should direct users to tag `@export-chat`, `@savechats`, or `@SaveThisChat`, then upload the returned `.md` transcript. Share links remain supported as a fallback.
- **Multiple input formats.** `chat-data.ts` accepts Poe Markdown transcripts, Poe raw `__NEXT_DATA__`, Poe saved `next-data.json`, and a simpler `{ messages: [{ role, content, attachments: [{url}] }] }` export shape. Preserve all when editing parse logic.
- **Two Poe next-data shapes.** Poe share data can appear under `chatShare.messagesConnection.edges[].node` or direct `chatShare.messages[]`. Keep both supported in `chat-data.ts` and `server.ts`.
- **Download behavior.** The zip preserves the uploaded source file (`.md` or `.json`) and adds every parsed attachment URL. It does not currently convert JSON to Markdown or Markdown to JSON.
- **Share-URL validation is duplicated** across `server.ts` and `app.ts`. Keep them in sync.

## Common commands

From `fullstack/`:

```bash
bun install --production   # deps
bun run server.ts          # dev server on :3000 (override via PORT env)
bun test                   # parser/unit tests
bunx tsc --noEmit          # strict type-check
bun build ./server.ts --target=bun --outdir=/tmp/poe-export-tools-build-check
bun run build.ts           # compile standalone ./fullstack binary
./fullstack                # run the compiled binary
```

From `legacy/`:

```bash
pip install -r requirements.txt
python poe_image_downloader.py    # or poe_text_downloader.py / creator_earnings.py
```

No linter or formatter is configured.

## Coding conventions

- **Try/catch sparingly.** Reserve for network I/O, disk I/O, user input, resource cleanup, and informational/control-flow exceptions. Do not wrap pure algorithms.
- **TypeScript is strict** with `noUncheckedIndexedAccess` and `noUnusedLocals`. Array/object indexing returns `T | undefined`. Dead code fails type-check.
- **No frontend framework.** Plain DOM APIs in `app.ts`. Don't introduce React/Vue/etc. without explicit ask.
