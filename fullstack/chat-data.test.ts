import { describe, expect, test } from "bun:test";
import { parseChatMessages } from "./chat-data";

describe("parseChatMessages", () => {
  test("keeps existing compact JSON export support", () => {
    const result = parseChatMessages(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: "show this",
            attachments: [{ url: "https://example.test/image.png" }],
          },
        ],
      })
    );

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "human",
        text: "show this",
        attachments: ["https://example.test/image.png"],
      },
    ]);
  });

  test("parses full Poe query request JSON exports", () => {
    const result = parseChatMessages(
      JSON.stringify({
        version: "1.1",
        type: "query",
        conversation_id: "c-test",
        user_id: "u-test",
        message_id: "r-test",
        bot_query_id: "b-test",
        query: [
          {
            role: "bot",
            sender_id: "ImageBot",
            sender: { id: null, name: "ImageBot" },
            content: "![cat](https://example.test/cat.png)",
            content_type: "text/markdown",
            timestamp: 1782898400605901,
            message_id: "m-bot",
            feedback: [],
            attachments: [
              {
                name: "cat.png",
                content_type: "image/png",
                url: "https://example.test/cat.png",
                parsed_content: "a cat",
              },
            ],
            metadata: null,
            reactions: [],
          },
          {
            role: "user",
            sender_id: "u-test",
            sender: { id: "u-test", name: null },
            content: "save this",
            content_type: "text/markdown",
            timestamp: 178289840627193,
            message_id: "m-user",
            attachments: [],
          },
        ],
      })
    );

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "bot",
        text: "![cat](https://example.test/cat.png)",
        attachments: ["https://example.test/cat.png"],
      },
      {
        role: "human",
        text: "save this",
        attachments: [],
      },
    ]);
  });

  test("parses Poe next-data chatShare messages arrays", () => {
    const result = parseChatMessages(
      JSON.stringify({
        props: {
          pageProps: {
            data: {
              mainQuery: {
                chatShare: {
                  messages: [
                    {
                      author: "human",
                      text: "make an image",
                    },
                    {
                      author: "pacarana",
                      text: "[img]: https://example.test/image.png",
                      attachments: [
                        {
                          name: "image",
                          url: "https://example.test/image.png?w=1408&h=768",
                          file: {
                            mimeType: "image/png",
                            url: "https://example.test/image.png?w=1408&h=768",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      })
    );

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "human",
        text: "make an image",
        attachments: [],
      },
      {
        role: "bot",
        text: "[img]: https://example.test/image.png",
        attachments: ["https://example.test/image.png?w=1408&h=768"],
      },
    ]);
  });

  test("parses Markdown transcripts emitted by the Poe export bots", () => {
    const result = parseChatMessages(`User:

Hello

---

GPT-5.5:

Here is the image and video.

![cat](<https://example.test/cat.png>)

[clip.mp4](<https://example.test/base/video.mp4?download=1&name=clip>)`);

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "human",
        text: "Hello",
        attachments: [],
      },
      {
        role: "bot",
        text: "Here is the image and video.\n\nclip.mp4",
        attachments: [
          "https://example.test/cat.png",
          "https://example.test/base/video.mp4?download=1&name=clip",
        ],
      },
    ]);
  });

  test("parses legacy embedded media iframes", () => {
    const mediaHtml =
      '<body><video src="https://example.test/base/video.mp4?download=1&amp;name=clip" controls></video></body>';
    const mediaSrc = `data:text/html;charset=utf-8,${encodeURIComponent(mediaHtml)}`;
    const result = parseChatMessages(`Bot:

<iframe width="100%" height="720" src="${mediaSrc}" allow="autoplay"></iframe>`);

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "bot",
        text: "",
        attachments: ["https://example.test/base/video.mp4?download=1&name=clip"],
      },
    ]);
  });

  test("parses Markdown reference attachment links", () => {
    const result = parseChatMessages(`Bot:

[video_0]: <https://example.test/video.mp4>`);

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "bot",
        text: "",
        attachments: ["https://example.test/video.mp4"],
      },
    ]);
  });
});
