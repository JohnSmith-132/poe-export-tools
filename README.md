<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/frontboat/poe-export-tools">
    <img src="fullstack/static/faviconpng.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">export.tools</h3>

  <p align="center">
    Browse and download media from your Poe chat shares — a small Bun fullstack app.
    <br />
    <a href="fullstack/"><strong>Open the fullstack project »</strong></a>
    <br />
    <br />
    <a href="https://github.com/frontboat/poe-export-tools/issues/new?labels=bug">Report Bug</a>
    ·
    <a href="https://github.com/frontboat/poe-export-tools/issues/new?labels=enhancement">Request Feature</a>
    ·
    <a href="legacy/">Legacy Python Tools</a>
  </p>

  <p align="center">
    <a href="LICENSE"><img src="https://img.shields.io/github/license/frontboat/poe-export-tools.svg?style=for-the-badge" alt="MIT License"/></a>
    <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun"/></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/></a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project

<p align="center">
  <img src="images/usage.webp" alt="export.tools grid view" width="760">
</p>

export.tools extracts attachment URLs from Poe share links. Paste a `https://poe.com/s/<id>` URL, browse the media in grid or chat view, and download everything as a zip — compression happens entirely in the browser.

### Features

- Paste a Poe share URL and see every attachment inline (images + videos)
- Toggle between a media grid and a chat-transcript view
- Upload a saved `next-data.json` to re-open a previous export offline
- Download all attachments plus `next-data.json` as a single zip

### Grabbing a share URL

On Poe, open the chat menu and tap **Share entire chat** to copy a `https://poe.com/s/<id>` URL, then paste it into export.tools.

<p align="center">
  <img src="images/how-to-share.webp" alt="Poe chat menu with Share entire chat highlighted" width="260">
</p>

<!-- GETTING STARTED -->
## Getting Started

### Installation

1. Clone the repo (boat maintains most actively)
   ```sh
   git clone https://github.com/frontboat/poe-export-tools.git
   ```
2. Enter the fullstack project
   ```sh
   cd poe-export-tools/fullstack
   ```
3. Install dependencies
   ```sh
   bun install --production
   ```

### Running locally

```sh
bun run server.ts
```

Open `http://localhost:3000`.

### Building

```sh
bun run build.ts
./fullstack
```

The build target defaults to `bun-linux-x64` (Railway). For a locally runnable binary on Apple Silicon, change `target` to `bun-darwin-arm64-modern` in `fullstack/build.ts` before building — don't commit that change.

<!-- DEPLOYMENT -->
## Deployment

Configured for Railway:

```
RAILPACK_BUILD_CMD="bun run build.ts"
RAILPACK_START_CMD="./fullstack"
RAILPACK_INSTALL_CMD="bun install --production"
RAILPACK_PACKAGES="bun@latest"
```

<!-- LEGACY -->
## Legacy Python Tools

The original upstream Selenium-based scripts — image downloader, chat text downloader, creator earnings exporter — live in [`legacy/`](legacy/) along with their own README. This fork no longer maintains them.

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- DISCLAIMER -->
## Disclaimer

This tool is for personal use. Please respect Poe's terms of service and only export content you have permission to access.
