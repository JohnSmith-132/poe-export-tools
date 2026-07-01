export type ChatMessage = {
  role: "human" | "bot";
  text: string;
  attachments: string[];
};

export type ChatParseResult = {
  messages: ChatMessage[];
  error: string | null;
};

type PoeAttachment = {
  url?: string;
  file?: {
    url?: string;
  };
};

type PoeMessage = {
  author?: string;
  text?: string;
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

type ExportAttachment = {
  url?: string;
  file?: {
    url?: string;
  };
};

type ExportMessage = {
  role?: string;
  content?: string;
  attachments?: ExportAttachment[];
};

type ExportData = {
  messages?: ExportMessage[];
  query?: ExportMessage[];
};

type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function parseChatMessages(raw: string | null): ChatParseResult {
  if (!raw) return { messages: [], error: null };

  const json = parseJson(raw);
  if (json.ok) {
    return parseJsonChatMessages(json.value);
  }

  const markdown = parseMarkdownTranscript(raw);
  if (markdown.messages.length > 0) {
    return markdown;
  }

  if (looksLikeJson(raw)) {
    return { messages: [], error: `Invalid JSON payload: ${json.error}` };
  }

  return {
    messages: [],
    error: "Chat data missing from Markdown or JSON payload.",
  };
}

function parseJson(raw: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function looksLikeJson(raw: string) {
  const first = raw.trimStart().at(0);
  return first === "{" || first === "[";
}

function parseJsonChatMessages(data: unknown): ChatParseResult {
  const chatShare = (data as PoeNextData)?.props?.pageProps?.data?.mainQuery?.chatShare;
  const nextDataEdges =
    chatShare?.messagesConnection?.edges;
  if (Array.isArray(nextDataEdges)) {
    return {
      messages: nextDataEdges.map((edge) => parsePoeMessage(edge?.node)),
      error: null,
    };
  }

  if (Array.isArray(chatShare?.messages)) {
    return {
      messages: chatShare.messages.map(parsePoeMessage),
      error: null,
    };
  }

  const exportData = data as ExportData;
  const exportMessages = exportData.messages ?? exportData.query;
  if (Array.isArray(exportMessages)) {
    return {
      messages: exportMessages.map((message) => ({
        role: message?.role === "user" ? "human" : "bot",
        text: typeof message?.content === "string" ? message.content : "",
        attachments: collectExportAttachmentUrls(message?.attachments),
      })),
      error: null,
    };
  }

  return { messages: [], error: "Chat data missing from JSON payload." };
}

function parsePoeMessage(message: PoeMessage | undefined): ChatMessage {
  return {
    role: message?.author === "human" ? "human" : "bot",
    text: typeof message?.text === "string" ? message.text : "",
    attachments: collectPoeAttachmentUrls(message?.attachments),
  };
}

function collectPoeAttachmentUrls(attachments: PoeAttachment[] | undefined) {
  if (!Array.isArray(attachments)) return [];

  const urls: string[] = [];
  const seen = new Set<string>();
  for (const attachment of attachments) {
    const url = attachment?.file?.url ?? attachment?.url;
    appendUrl(urls, seen, url);
  }

  return urls;
}

function collectExportAttachmentUrls(attachments: ExportAttachment[] | undefined) {
  if (!Array.isArray(attachments)) return [];

  const urls: string[] = [];
  const seen = new Set<string>();
  for (const attachment of attachments) {
    appendUrl(urls, seen, attachment?.file?.url ?? attachment?.url);
  }

  return urls;
}

function parseMarkdownTranscript(raw: string): ChatParseResult {
  const messages: ChatMessage[] = [];
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const match = block.match(/^([^\n:]{1,120}):\s*(?:\n+([\s\S]*))?$/);
    if (!match?.[1]) continue;

    const body = (match[2] ?? "").trim();
    messages.push({
      role: inferMarkdownRole(match[1]),
      text: markdownBodyToText(body),
      attachments: extractMarkdownAttachmentUrls(body),
    });
  }

  return { messages, error: null };
}

function inferMarkdownRole(label: string): "human" | "bot" {
  const normalized = label.trim().toLowerCase();
  return normalized === "user" || normalized === "human" ? "human" : "bot";
}

function markdownBodyToText(body: string) {
  return body
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/!\[[^\]]*]\(\s*<?[^)\n>]+>?\s*\)/g, "")
    .replace(/\[([^\]]+)]\(\s*<?[^)\n>]+>?\s*\)/g, "$1")
    .replace(/^\[[^\]]+]:\s*<[^>]+>\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractMarkdownAttachmentUrls(body: string) {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(/!?\[[^\]]*]\(\s*<?([^)\n>]+)>?\s*\)/g)) {
    appendUrl(urls, seen, match[1]);
  }

  for (const match of body.matchAll(/^\[[^\]]+]:\s*<([^>]+)>\s*$/gm)) {
    appendUrl(urls, seen, match[1]);
  }

  for (const match of body.matchAll(/<iframe\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi)) {
    const src = decodeHtmlAttribute(match[2] ?? "");
    for (const mediaUrl of extractMediaUrlsFromIframeSource(src)) {
      appendUrl(urls, seen, mediaUrl);
    }
  }

  for (const mediaUrl of extractMediaUrlsFromHtml(body)) {
    appendUrl(urls, seen, mediaUrl);
  }

  return urls;
}

function extractMediaUrlsFromIframeSource(src: string) {
  if (!src.toLowerCase().startsWith("data:text/html")) return [];

  const commaIndex = src.indexOf(",");
  if (commaIndex < 0) return [];

  const encoded = src.slice(commaIndex + 1);
  try {
    return extractMediaUrlsFromHtml(decodeURIComponent(encoded));
  } catch {
    return [];
  }
}

function extractMediaUrlsFromHtml(markup: string) {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const match of markup.matchAll(/<(?:audio|video)\b[^>]*\bsrc=(["'])(.*?)\1/gi)) {
    appendUrl(urls, seen, decodeHtmlAttribute(match[2] ?? ""));
  }

  return urls;
}

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function appendUrl(urls: string[], seen: Set<string>, rawUrl: string | undefined) {
  const url = rawUrl?.trim();
  if (!url || seen.has(url)) return;

  urls.push(url);
  seen.add(url);
}
