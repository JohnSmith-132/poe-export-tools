import { downloadZip } from "client-zip";
import { parseChatMessages, type ChatMessage } from "./chat-data";

const form = document.querySelector<HTMLFormElement>("#share-form");
const input = document.querySelector<HTMLInputElement>("#share-url");
const grid = document.querySelector<HTMLElement>("#grid");
const chat = document.querySelector<HTMLElement>("#chat");
const leftButton = document.querySelector<HTMLButtonElement>("#left-action");
const rightButton = document.querySelector<HTMLButtonElement>("#right-action");
const actionMenu = document.querySelector<HTMLElement>("#action-menu");
const menuDownload = document.querySelector<HTMLButtonElement>("#menu-download");
const menuUpload = document.querySelector<HTMLButtonElement>("#menu-upload");
const menuToggle = document.querySelector<HTMLButtonElement>("#menu-toggle");
const uploadInput = document.querySelector<HTMLInputElement>("#upload-input");
const notice = document.querySelector<HTMLElement>("#notice");
const intro = document.querySelector<HTMLElement>("#intro");
const imageViewer = document.querySelector<HTMLElement>("#image-viewer");
const viewerStage = document.querySelector<HTMLElement>("#viewer-stage");
const viewerImage = document.querySelector<HTMLImageElement>("#viewer-image");
const viewerCount = document.querySelector<HTMLElement>("#viewer-count");
const viewerClose = document.querySelector<HTMLButtonElement>("#viewer-close");
const viewerPrev = document.querySelector<HTMLButtonElement>("#viewer-prev");
const viewerNext = document.querySelector<HTMLButtonElement>("#viewer-next");

const urls: string[] = [];
const imageUrls: string[] = [];
let sourceFile: SourceFile | null = null;
let chatMessages: ChatMessage[] = [];
let isChatView = false;
let isLoading = false;
let isMenuOpen = false;
let viewerIndex = -1;
let viewerTouchStartX: number | null = null;

const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);
const audioExtensions = new Set(["mp3", "wav", "m4a", "weba"]);
const imageExtensions = new Set(["avif", "gif", "jpeg", "jpg", "png", "webp"]);
const fileExtensions = new Set([
  "csv",
  "doc",
  "docx",
  "json",
  "md",
  "pdf",
  "txt",
  "xls",
  "xlsx",
  "zip",
]);

const icons = {
  upload:
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload-icon lucide-upload"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
  home:
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house-icon lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  paste:
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-paste-icon lucide-clipboard-paste"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  enter:
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  ellipsis:
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical-icon lucide-ellipsis-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  file:
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
};

type SourceFile = {
  name: string;
  raw: string;
  type: string;
};

// WebMCP APIs (Chrome 150+ origin trial) — not yet in lib.dom.
type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (params: Record<string, unknown>) => string | Promise<string>;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: ModelContextTool,
        options?: { signal?: AbortSignal; exposedTo?: string[] }
      ) => Promise<void>;
    };
  }
  interface SubmitEvent {
    agentInvoked?: boolean;
    respondWith?: (result: Promise<unknown>) => void;
  }
}

// WebMCP: never mutate the share form's fields here. The browser derives the
// declarative load_poe_share tool definition from the form, and changing a
// field (e.g. toggling `disabled`) mid-fetch cancels the in-flight agent tool
// call with "tool definition was updated". Re-entry is guarded in fetchShare.
function setLoading(loading: boolean) {
  isLoading = loading;
  updateHeaderState();
}

function setError(message: string | null) {
  if (!notice) return;
  if (message) {
    notice.textContent = message;
    notice.classList.remove("is-hidden");
  } else {
    notice.textContent = "";
    notice.classList.add("is-hidden");
  }
}

function normalizeShareUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.hostname !== "poe.com") return null;
    if (url.search || url.hash) return null;
    const match = url.pathname.match(/^\/s\/[^/]+$/);
    if (!match) return null;
    return `https://poe.com${url.pathname}`;
  } catch {
    return null;
  }
}

function clearGrid() {
  if (grid) grid.textContent = "";
}

function clearChat() {
  if (chat) chat.textContent = "";
}

function setViewMode(view: "grid" | "chat") {
  isChatView = view === "chat";
  if (grid) grid.classList.toggle("is-hidden", isChatView);
  if (chat) chat.classList.toggle("is-hidden", !isChatView);
  updateHeaderState();
}

function setButtonIcon(
  button: HTMLButtonElement | null,
  icon: string,
  label: string,
  key: string
) {
  if (!button) return;
  if (button.dataset.icon !== key) {
    button.innerHTML = icon;
    button.dataset.icon = key;
  }
  button.setAttribute("aria-label", label);
}

function setMenuOpen(open: boolean) {
  isMenuOpen = open;
  updateHeaderState();
}

function hasContent() {
  return urls.length > 0 || chatMessages.length > 0 || Boolean(sourceFile);
}

function updateHeaderState() {
  const showContent = hasContent();
  const trimmed = input?.value.trim() ?? "";
  if (!showContent && isMenuOpen) {
    isMenuOpen = false;
  }

  if (intro) intro.classList.toggle("is-hidden", showContent);

  setButtonIcon(
    leftButton,
    showContent ? icons.home : icons.upload,
    showContent ? "Home" : "Upload chat export",
    showContent ? "home" : "upload"
  );
  if (leftButton) leftButton.disabled = isLoading;

  if (showContent) {
    setButtonIcon(rightButton, icons.ellipsis, "More actions", "ellipsis");
    if (rightButton) {
      rightButton.setAttribute("aria-expanded", isMenuOpen ? "true" : "false");
      rightButton.setAttribute("aria-haspopup", "menu");
    }
  } else {
    const showEnter = trimmed.length > 0;
    setButtonIcon(
      rightButton,
      showEnter ? icons.enter : icons.paste,
      showEnter ? "Fetch share URL" : "Paste share URL",
      showEnter ? "enter" : "paste"
    );
    if (rightButton) {
      rightButton.removeAttribute("aria-expanded");
      rightButton.removeAttribute("aria-haspopup");
    }
  }
  if (rightButton) rightButton.disabled = isLoading;

  if (actionMenu) {
    actionMenu.classList.toggle("is-hidden", !showContent || !isMenuOpen);
  }

  if (menuDownload) {
    menuDownload.disabled = isLoading || (urls.length === 0 && !sourceFile);
  }
  if (menuUpload) {
    menuUpload.disabled = isLoading;
  }
  if (menuToggle) {
    menuToggle.disabled = isLoading || chatMessages.length === 0;
    menuToggle.setAttribute("aria-pressed", isChatView ? "true" : "false");
    menuToggle.dataset.active = isChatView ? "true" : "false";
  }
}

function attachmentFilename(url: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

function describeAttachment(url: string, index?: number) {
  const filename = attachmentFilename(url);
  if (filename) {
    return typeof index === "number"
      ? `Attachment ${index + 1}: ${filename}`
      : `Attachment: ${filename}`;
  }
  return typeof index === "number" ? `Attachment ${index + 1}` : "Attachment";
}

function createMediaItem(
  url: string,
  className: string,
  index?: number,
  loading: "eager" | "lazy" = "lazy"
) {
  const label = describeAttachment(url, index);
  if (isVideoUrl(url)) {
    const item = createMediaShell("div", className, index);
    const preview = createMediaPreview();
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", label);
    preview.appendChild(video);
    item.appendChild(preview);
    return item;
  } else if (isAudioUrl(url)) {
    const item = createMediaShell("div", className, index);
    const preview = createMediaPreview();
    const audio = document.createElement("audio");
    audio.src = url;
    audio.controls = true;
    audio.preload = "metadata";
    audio.setAttribute("aria-label", label);
    preview.appendChild(audio);
    item.appendChild(preview);
    return item;
  } else if (isFileUrl(url)) {
    const item = createMediaShell("a", className, index);
    item.href = url;
    item.target = "_blank";
    item.rel = "noreferrer";
    item.setAttribute("aria-label", label);

    const preview = createMediaPreview();
    const file = document.createElement("div");
    file.className = "file-preview";
    file.innerHTML = icons.file;

    const name = document.createElement("span");
    name.textContent = attachmentFilename(url) || "File";
    file.appendChild(name);
    preview.appendChild(file);
    item.appendChild(preview);
    return item;
  }

  const item = createMediaShell("button", className, index);
  item.type = "button";
  item.setAttribute("aria-label", `Preview ${label}`);
  item.addEventListener("click", () => openImageViewer(url));

  const preview = createMediaPreview();
  const img = document.createElement("img");
  img.src = url;
  img.loading = loading;
  img.alt = label;
  preview.appendChild(img);
  item.appendChild(preview);
  return item;
}

function createMediaShell<T extends "a" | "button" | "div">(
  tagName: T,
  className: string,
  index?: number
) {
  const element = document.createElement(tagName);
  element.className = className;
  if (typeof index === "number") {
    element.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;
  }
  return element;
}

function createMediaPreview() {
  const preview = document.createElement("div");
  preview.className = "media-preview";
  return preview;
}

function renderUrls(list: string[]) {
  if (!grid) return;

  clearGrid();
  if (list.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach((url, index) => {
    fragment.appendChild(createMediaItem(url, "media-item", index));
  });

  grid.appendChild(fragment);
}

function renderChat(messages: ChatMessage[]) {
  if (!chat) return;
  clearChat();
  if (messages.length === 0) return;

  const fragment = document.createDocumentFragment();

  messages.forEach((message) => {
    if (!message.text && message.attachments.length === 0) return;
    const row = document.createElement("div");
    row.className = `chat-row ${
      message.role === "human" ? "chat-row-human" : "chat-row-bot"
    }`;

    const card = document.createElement("div");
    card.className = "chat-card";
    if (message.attachments.length > 0) {
      card.classList.add("chat-card-has-media");
    }

    if (message.text) {
      const text = document.createElement("p");
      text.className = "chat-text";
      text.textContent = message.text;
      card.appendChild(text);
    }

    if (message.attachments.length > 0) {
      const media = document.createElement("div");
      media.className = "chat-media";
      message.attachments.forEach((url) => {
        media.appendChild(createMediaItem(url, "chat-media-item", undefined, "eager"));
      });
      card.appendChild(media);
    }

    row.appendChild(card);
    fragment.appendChild(row);
  });

  chat.appendChild(fragment);
}

function applyChatData(
  raw: string | null,
  fallbackUrls: string[] = [],
  sourceName = "chat-export.json"
) {
  sourceFile = raw
    ? { name: sourceName, raw, type: contentTypeForSourceName(sourceName) }
    : null;
  const parsed = parseChatMessages(raw);
  chatMessages = parsed.messages;
  urls.length = 0;
  imageUrls.length = 0;
  const seen = new Set<string>();
  for (const message of chatMessages) {
    for (const url of message.attachments) {
      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }
  if (urls.length === 0 && fallbackUrls.length > 0) {
    urls.push(...fallbackUrls);
  }
  syncImageUrls();

  renderUrls(urls);
  renderChat(chatMessages);
  setError(parsed.error);
  const nextView = isChatView && chatMessages.length > 0 ? "chat" : "grid";
  setMenuOpen(false);
  setViewMode(nextView);
}

function contentTypeForSourceName(name: string) {
  return name.toLowerCase().endsWith(".md")
    ? "text/markdown"
    : "application/json";
}

function formatGalleryZipName(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  return `gallery${month}${day}${year}.zip`;
}

function buildAttachmentName(rawUrl: string, index: number, seenNames: Map<string, number>) {
  let name = `attachment-${index + 1}`;
  try {
    const url = new URL(rawUrl);
    name = url.pathname.split("/").pop() || name;
  } catch {
    // Fallback to default name.
  }

  const count = seenNames.get(name) ?? 0;
  if (count > 0) {
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex > 0) {
      name = name.slice(0, dotIndex) + `-${count + 1}` + name.slice(dotIndex);
    } else {
      name = `${name}-${count + 1}`;
    }
  }

  if (!name.includes(".")) {
    name = `${name}.${isVideoUrl(rawUrl) ? "mp4" : "png"}`;
  }

  seenNames.set(name, count + 1);
  return name;
}

function isVideoUrl(rawUrl: string) {
  const extension = extensionFromUrl(rawUrl);
  if (extension && videoExtensions.has(extension)) return true;

  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/");
    return segments.includes("video");
  } catch {
    return false;
  }
}

function isAudioUrl(rawUrl: string) {
  const extension = extensionFromUrl(rawUrl);
  return extension ? audioExtensions.has(extension) : false;
}

function isFileUrl(rawUrl: string) {
  const extension = extensionFromUrl(rawUrl);
  return extension ? fileExtensions.has(extension) : false;
}

function extensionFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const lastSegment = url.pathname.split("/").pop() ?? "";
    const extension = lastSegment.split(".").pop()?.toLowerCase();
    return extension && extension !== lastSegment.toLowerCase() ? extension : "";
  } catch {
    return "";
  }
}

function isImageUrl(rawUrl: string) {
  if (rawUrl.startsWith("data:image/")) return true;
  if (isVideoUrl(rawUrl) || isAudioUrl(rawUrl) || isFileUrl(rawUrl)) return false;
  const extension = extensionFromUrl(rawUrl);
  if (extension) return imageExtensions.has(extension);

  try {
    const url = new URL(rawUrl);
    return url.pathname.split("/").includes("image");
  } catch {
    return true;
  }
}

function syncImageUrls() {
  imageUrls.length = 0;
  for (const url of urls) {
    if (isImageUrl(url)) {
      imageUrls.push(url);
    }
  }
}

function openImageViewer(url: string) {
  const index = imageUrls.indexOf(url);
  if (index < 0) return;

  viewerIndex = index;
  renderImageViewer();
  imageViewer?.classList.remove("is-hidden");
  document.body.classList.add("has-image-viewer");
  viewerClose?.focus();
}

function closeImageViewer() {
  if (viewerIndex < 0) return;

  viewerIndex = -1;
  imageViewer?.classList.add("is-hidden");
  document.body.classList.remove("has-image-viewer");
  if (viewerImage) {
    viewerImage.removeAttribute("src");
    viewerImage.alt = "";
  }
}

function showViewerImage(delta: number) {
  if (viewerIndex < 0 || imageUrls.length === 0) return;

  viewerIndex = (viewerIndex + delta + imageUrls.length) % imageUrls.length;
  renderImageViewer();
}

function renderImageViewer() {
  if (!viewerImage || !viewerCount || viewerIndex < 0) return;

  const url = imageUrls[viewerIndex];
  if (!url) return;

  viewerImage.src = url;
  viewerImage.alt = describeAttachment(url);
  viewerCount.textContent = `${viewerIndex + 1} / ${imageUrls.length}`;

  const hasMultipleImages = imageUrls.length > 1;
  if (viewerPrev) viewerPrev.disabled = !hasMultipleImages;
  if (viewerNext) viewerNext.disabled = !hasMultipleImages;
}

async function fetchShare(): Promise<string> {
  if (!input) return "Share input unavailable.";
  if (isLoading) return "A share URL is already loading — wait for it to finish.";
  const shareUrl = input.value.trim();

  if (!shareUrl) {
    return "No share URL entered.";
  }

  const normalized = normalizeShareUrl(shareUrl);
  if (!normalized) {
    const message = "Invalid share URL. Expected https://poe.com/s/<share-id>.";
    setError(message);
    return message;
  }

  if (input) input.value = normalized;
  setError(null);
  urls.length = 0;
  imageUrls.length = 0;
  sourceFile = null;
  chatMessages = [];
  closeImageViewer();
  clearGrid();
  clearChat();
  setLoading(true);
  try {
    const response = await fetch(`/api/share?url=${encodeURIComponent(normalized)}`);
    let data: unknown = null;
    try {
      data = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = `Failed to read server response: ${message}`;
      setError(status);
      return status;
    }
    const payload = data as { urls?: unknown; nextData?: unknown; error?: unknown };

    if (!response.ok) {
      const message = typeof payload?.error === "string" ? payload.error : "Request failed.";
      setError(message);
      return message;
    }

    const fallbackUrls = Array.isArray(payload?.urls)
      ? (payload.urls as string[])
      : [];
    const raw =
      typeof payload?.nextData === "string" ? (payload.nextData as string) : null;
    applyChatData(raw, fallbackUrls, "next-data.json");
    const url = new URL(window.location.href);
    url.searchParams.set("url", normalized);
    window.history.replaceState({}, "", url.toString());
    return `Loaded ${chatMessages.length} message(s) and ${urls.length} attachment(s) from ${normalized}.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = `Request failed: ${message}`;
    setError(status);
    return status;
  } finally {
    setLoading(false);
  }
}

async function downloadAll(): Promise<string | null> {
  if (urls.length === 0 && !sourceFile) return null;
  if (menuDownload) menuDownload.disabled = true;
  const filename = formatGalleryZipName(new Date());

  try {
    const seenNames = new Map<string, number>();
    const zipResponse = downloadZip(
      (async function* () {
        if (sourceFile) {
          yield {
            name: sourceFile.name,
            input: new Blob([sourceFile.raw], { type: sourceFile.type }),
          };
        }
        for (const [index, url] of urls.entries()) {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch attachment ${index + 1}`);
          }

          yield {
            name: buildAttachmentName(url, index, seenNames),
            input: response,
          };
        }
      })()
    );

    const blob = await zipResponse.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    return filename;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setError(`Download failed: ${message}`);
    return null;
  } finally {
    if (menuDownload) menuDownload.disabled = false;
  }
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = fetchShare();
  // WebMCP: when an agent invoked the declarative load_poe_share tool,
  // resolve the tool call with the load outcome instead of leaving it hanging.
  if (event.agentInvoked && event.respondWith) {
    event.respondWith(result);
    return;
  }
  void result;
});

input?.addEventListener("input", () => {
  setError(null);
  updateHeaderState();
});

leftButton?.addEventListener("click", () => {
  if (leftButton?.disabled) return;
  if (hasContent()) {
    urls.length = 0;
    imageUrls.length = 0;
    sourceFile = null;
    chatMessages = [];
    closeImageViewer();
    clearGrid();
    clearChat();
    setError(null);
    if (input) input.value = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("url");
    window.history.replaceState({}, "", url.toString());
    setMenuOpen(false);
    setViewMode("grid");
    return;
  }
  uploadInput?.click();
});

rightButton?.addEventListener("click", () => {
  if (rightButton?.disabled) return;
  if (hasContent()) {
    setMenuOpen(!isMenuOpen);
    return;
  }
  const trimmed = input?.value.trim() ?? "";
  if (trimmed.length > 0) {
    void fetchShare();
    return;
  }
  void (async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setError("Clipboard access unavailable. Paste the URL manually.");
        if (input) input.focus();
        return;
      }
      setError(null);
      const text = await navigator.clipboard.readText();
      if (input) input.value = text.trim();
    } catch {
      setError("Clipboard access blocked. Paste the URL manually.");
      if (input) input.focus();
    } finally {
      updateHeaderState();
    }
  })();
});

function closeMenuRestoreFocus() {
  setMenuOpen(false);
  rightButton?.focus();
}

menuDownload?.addEventListener("click", () => {
  if (menuDownload?.disabled) return;
  closeMenuRestoreFocus();
  void downloadAll();
});

menuUpload?.addEventListener("click", () => {
  if (menuUpload?.disabled) return;
  closeMenuRestoreFocus();
  uploadInput?.click();
});

menuToggle?.addEventListener("click", () => {
  if (menuToggle?.disabled) return;
  closeMenuRestoreFocus();
  setViewMode(isChatView ? "grid" : "chat");
});

uploadInput?.addEventListener("change", () => {
  const file = uploadInput.files?.[0];
  if (!file) return;
  void (async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      if (input) input.value = "";
      applyChatData(text, [], file.name || "chat-export");
      const url = new URL(window.location.href);
      url.searchParams.delete("url");
      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to read file: ${message}`);
    } finally {
      setLoading(false);
      uploadInput.value = "";
    }
  })();
});

document.addEventListener("click", (event) => {
  if (!isMenuOpen) return;
  const target = event.target as Node;
  if (actionMenu?.contains(target) || rightButton?.contains(target)) {
    return;
  }
  setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (viewerIndex >= 0) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeImageViewer();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showViewerImage(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showViewerImage(1);
    }
    return;
  }

  if (event.key !== "Escape") return;
  if (!isMenuOpen) return;
  event.preventDefault();
  closeMenuRestoreFocus();
});

imageViewer?.addEventListener("click", (event) => {
  if (event.target === imageViewer) {
    closeImageViewer();
  }
});

viewerClose?.addEventListener("click", closeImageViewer);
viewerPrev?.addEventListener("click", () => showViewerImage(-1));
viewerNext?.addEventListener("click", () => showViewerImage(1));

viewerStage?.addEventListener("touchstart", (event) => {
  viewerTouchStartX = event.changedTouches[0]?.clientX ?? null;
});

viewerStage?.addEventListener("touchend", (event) => {
  if (viewerTouchStartX === null) return;

  const endX = event.changedTouches[0]?.clientX;
  if (typeof endX !== "number") return;

  const delta = endX - viewerTouchStartX;
  viewerTouchStartX = null;
  if (Math.abs(delta) < 40) return;
  showViewerImage(delta > 0 ? -1 : 1);
});

// Agent-facing tools (WebMCP imperative API). The share form registers
// `load_poe_share` declaratively via its toolname/tooldescription attributes;
// these cover the actions that aren't forms.
const modelContext = document.modelContext;
if (modelContext) {
  void modelContext.registerTool({
    name: "list_attachments",
    description:
      "List the state of the currently loaded Poe chat export: source file name, message count, attachment count, and the first attachment URLs. Returns JSON. Use after loading a share URL or uploading a transcript to see what the page contains.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      // Keep output within the ~1.5K character budget recommended for tools.
      const maxListed = 6;
      return JSON.stringify({
        loaded: hasContent(),
        source: sourceFile?.name ?? null,
        messageCount: chatMessages.length,
        attachmentCount: urls.length,
        attachmentUrls: urls.slice(0, maxListed),
        ...(urls.length > maxListed
          ? {
              note: `${urls.length - maxListed} more attachment URL(s) omitted; use download_attachments_zip to fetch everything.`,
            }
          : {}),
      });
    },
  });

  void modelContext.registerTool({
    name: "download_attachments_zip",
    description:
      "Build a zip containing the loaded chat transcript plus every attachment and download it to the user's device. Requires a chat to be loaded first (via the load_poe_share form or a transcript upload).",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      if (urls.length === 0 && !sourceFile) {
        return "Nothing to download — load a Poe share URL or upload a transcript first.";
      }
      const filename = await downloadAll();
      return filename
        ? `Started download of ${filename} (${urls.length} attachment(s) plus the source transcript).`
        : `Download failed: ${notice?.textContent || "unknown error"}`;
    },
  });

  void modelContext.registerTool({
    name: "set_view_mode",
    description:
      "Switch the loaded conversation between the attachment grid view and the chat transcript view.",
    inputSchema: {
      type: "object",
      properties: {
        view: {
          type: "string",
          enum: ["grid", "chat"],
          description: "Which view to show: 'grid' (attachments) or 'chat' (transcript).",
        },
      },
      required: ["view"],
    },
    execute: (params) => {
      const view = params["view"];
      if (view !== "grid" && view !== "chat") {
        return 'Invalid view — use "grid" or "chat".';
      }
      if (view === "chat" && chatMessages.length === 0) {
        return "Chat view unavailable — the loaded export has no parsed messages.";
      }
      setViewMode(view);
      return `Now showing the ${view} view.`;
    },
  });
}

const params = new URLSearchParams(window.location.search);
const initialUrl = params.get("url");
if (initialUrl && input) {
  input.value = initialUrl;
  void fetchShare();
}

setViewMode("grid");
