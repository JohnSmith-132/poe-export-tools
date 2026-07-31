import { serve, embeddedFiles } from "bun";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import index from "./index.html";

// Files referenced only in meta tags, manifest.json, or `rel="shortcut icon"`
// — Bun's HTML bundler can't trace these, so import explicitly to embed them.
import "./static/og.png" with { type: "file" };
import "./static/og_image.svg" with { type: "file" };
import "./static/favicon.ico" with { type: "file" };
import "./static/webappmanifestbig.png" with { type: "file" };
import "./static/webappmanifestsmall.png" with { type: "file" };

const allowedHost = "poe.com";
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const envPort = Bun.env.PORT;
const parsedPort = envPort ? Number.parseInt(envPort, 10) : NaN;
const port = Number.isInteger(parsedPort) && parsedPort >= 0 ? parsedPort : 3000;

// Expose every embedded asset under /static/<name> for stable external refs
// (og:image, twitter:image, og:logo, sitemaps). Bun's HTML bundler serves the
// in-page hashed references automatically via routes: { "/": index }.
const staticRoutes: Record<string, Response> = {};
for (const blob of embeddedFiles) {
  const rawName = (blob as Blob & { name: string }).name.replace(/\\/g, "/").split("/").pop();
  if (!rawName) continue;
  // Skip bundler output that isn't a user-facing static asset.
  if (rawName.endsWith(".html")) continue;
  if (rawName.startsWith("chunk-")) continue;
  // Normalize hashed names (faviconpng-jd5gacpj.png) to their stable form.
  // Bun uses an alphanumeric hash (a-z, 0-9), not hex.
  const name = rawName.replace(/-[a-z0-9]{8}\./, ".");
  staticRoutes[`/static/${name}`] = new Response(blob);
}

const indexHtmlPath = join(import.meta.dir, "index.html");
const siteLastMod = statSync(existsSync(indexHtmlPath) ? indexHtmlPath : process.execPath)
  .mtime.toISOString()
  .slice(0, 10);

function normalizeShareUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.hostname !== allowedHost) return null;
    if (url.search || url.hash) return null;
    const match = url.pathname.match(/^\/s\/[^/]+$/);
    if (!match) return null;
    return `https://${allowedHost}${url.pathname}`;
  } catch {
    return null;
  }
}

async function extractAttachmentUrls(
  stream: ReadableStream<Uint8Array>
): Promise<{
  urls: string[];
  sawNextData: boolean;
  nextDataRaw: string | null;
  parseError: string | null;
}> {
  let nextDataPayload = "";
  let sawNextData = false;

  const rewriter = new HTMLRewriter().on('script[id="__NEXT_DATA__"]', {
    text(text) {
      sawNextData = true;
      nextDataPayload += text.text;
    },
  });

  const rewritten = rewriter.transform(new Response(stream));
  if (rewritten.body) {
    await rewritten.body.pipeTo(new WritableStream<Uint8Array>({ write() {} }));
  }

  if (!sawNextData) {
    return { urls: [], sawNextData: false, nextDataRaw: null, parseError: null };
  }

  try {
    const nextData = JSON.parse(nextDataPayload) as PoeNextData;
    return {
      urls: collectAttachmentUrls(nextData),
      sawNextData: true,
      nextDataRaw: nextDataPayload,
      parseError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return {
      urls: [],
      sawNextData: true,
      nextDataRaw: nextDataPayload,
      parseError: message,
    };
  } finally {
    nextDataPayload = "";
  }
}

type PoeAttachment = {
  url?: string;
  file?: {
    url?: string;
  };
};

type PoeMessage = {
  attachments?: PoeAttachment[];
};

type PoeMessageEdge = {
  node?: PoeMessage;
};

type PoeNextData = {
  props?: {
    pageProps?: {
      data?: {
        mainQuery?: {
          chatShare?: {
            messages?: PoeMessage[];
            messagesConnection?: {
              edges?: PoeMessageEdge[];
            };
          };
        };
      };
    };
  };
};

function collectAttachmentUrls(nextData: PoeNextData): string[] {
  const chatShare = nextData?.props?.pageProps?.data?.mainQuery?.chatShare;
  const edges =
    chatShare?.messagesConnection?.edges;
  const urls = new Set<string>();

  if (Array.isArray(edges)) {
    for (const edge of edges) {
      collectMessageAttachmentUrls(edge?.node, urls);
    }
  }

  if (Array.isArray(chatShare?.messages)) {
    for (const message of chatShare.messages) {
      collectMessageAttachmentUrls(message, urls);
    }
  }

  return [...urls];
}

function collectMessageAttachmentUrls(
  message: PoeMessage | undefined,
  urls: Set<string>
) {
  const attachments = message?.attachments;
  if (!Array.isArray(attachments)) return;

  for (const attachment of attachments) {
    const url = attachment?.file?.url ?? attachment?.url;
    if (typeof url === "string" && url.length > 0) {
      urls.add(url);
    }
  }
}
async function fetchShareUrls(shareUrl: string) {
  const response = await fetch(shareUrl, {
    headers: { 
      "User-Agent": userAgent,
      "Connection": "close"
     },
  });

  if (!response.ok) {
    const error =
      response.status === 404 ? "Share not found" : "Upstream error";
    return {
      error: { error, status: response.status },
      urls: [],
      nextDataRaw: null,
    };
  }

  if (!response.body) {
    return {
      error: { error: "Missing response body", status: 502 },
      urls: [],
      nextDataRaw: null,
    };
  }

  const { urls, sawNextData, nextDataRaw, parseError } = await extractAttachmentUrls(
    response.body
  );
  if (!sawNextData) {
    return {
      error: { error: "Missing __NEXT_DATA__ payload", status: 502 },
      urls: [],
      nextDataRaw: null,
    };
  }

  if (parseError) {
    console.warn("Failed to parse __NEXT_DATA__ payload", parseError);
    return {
      error: { error: "Invalid __NEXT_DATA__ payload", status: 502 },
      urls: [],
      nextDataRaw: null,
    };
  }

  return { urls, nextDataRaw, error: null };
}

const routes: Record<string, unknown> = {
  ...staticRoutes,
  "/": index,
  "/robots.txt": new Response(
    "User-agent: *\nAllow: /\nSitemap: https://export.tools/sitemap.xml\n",
    { headers: { "Content-Type": "text/plain" } }
  ),
  "/llms.txt": new Response(
    `# export.tools

> Free, client-side exporter for poe.com conversations. Load a Poe chat export (or a public poe.com share link) to view the conversation and download every message, image, video, and file as a single zip built entirely in the browser.

## How it works

1. Tag @export-chat, @savechats, or @SaveThisChat in the Poe conversation you want to save.
2. Download the transcript file (.md or .json) the bot returns.
3. Upload that file at https://export.tools/ to view the chat and bundle the transcript plus all attachments into a zip. Nothing is stored server-side.

As a fallback, paste a public share link of the form https://poe.com/s/<share-id> into the input at the top of the page.

## Key links

- [Home](https://export.tools/): upload a Poe transcript or paste a poe.com share link
- [Share API](https://export.tools/api/share?url=<poe-share-url>): JSON endpoint returning attachment URLs and the raw __NEXT_DATA__ payload for a public https://poe.com/s/<share-id> link

## Agent tools (WebMCP)

- load_poe_share: declarative form tool — fill the share_url field with a https://poe.com/s/<share-id> URL and submit to load the conversation
- list_attachments: read-only; returns JSON describing the loaded chat (source file, message count, attachment URLs)
- download_attachments_zip: downloads the loaded transcript and all attachments as one zip
- set_view_mode: switches between the attachment grid view and the chat transcript view
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  ),
  "/sitemap.xml": new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://export.tools/</loc>\n    <lastmod>${siteLastMod}</lastmod>\n  </url>\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml" } }
  ),
  "/api/embedded": {
    GET() {
      const files = embeddedFiles.map((blob) => ({
        name: (blob as Blob & { name: string }).name,
        size: blob.size,
        type: blob.type,
      }));
      return Response.json({ count: files.length, files });
    },
  },
  "/api/routes": {
    GET() {
      const explicit = Object.keys(routes).sort();
      // Bun's HTML bundler additionally serves every embedded file at /<name>
      // (its compiled output path), e.g. /faviconpng-7kqrmrr8.png
      const implicit = embeddedFiles
        .map((blob) => `/${(blob as Blob & { name: string }).name}`)
        .sort();
      return Response.json({
        explicit_count: explicit.length,
        explicit,
        implicit_via_html_bundler_count: implicit.length,
        implicit_via_html_bundler: implicit,
      });
    },
  },
  "/api/share": {
    async GET(req: Request) {
      const requestUrl = new URL(req.url);
      const rawUrl = requestUrl.searchParams.get("url");
      if (!rawUrl) {
        return Response.json({ error: "Missing url parameter" }, { status: 400 });
      }

      const shareUrl = normalizeShareUrl(rawUrl);
      if (!shareUrl) {
        return Response.json(
          { error: "Invalid share URL. Expected https://poe.com/s/<share-id>." },
          { status: 400 }
        );
      }

      try {
        const result = await fetchShareUrls(shareUrl);
        if (result.error) {
          const status =
            Number.isInteger(result.error.status) &&
            result.error.status >= 400 &&
            result.error.status <= 599
              ? result.error.status
              : 502;
          return Response.json(result.error, { status });
        }

        return Response.json({ urls: result.urls, nextData: result.nextDataRaw });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return Response.json({ error: `Fetch failed: ${message}` }, { status: 502 });
      }
    },
  },
};

const server = serve({ port, routes } as Parameters<typeof serve>[0]);

console.log(`Server running at http://localhost:${server.port}`);
