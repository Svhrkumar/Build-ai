type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type ChatMode = "chat" | "code"

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

type CodePayload = {
  assistantMessage: string
  code: string
  previewHtml: string
}

export const runtime = "nodejs"

const codeModePrompt = `
You are generating frontend UI concepts for a split-screen builder.

Return valid JSON only with this exact shape:
{
  "assistantMessage": "short explanation of what you built",
  "code": "the component code as a single string",
  "previewHtml": "a complete HTML document that visually previews the component"
}

Rules:
- Do not wrap the JSON in markdown.
- "code" should be readable React/Next-compatible JSX.
- Use Tailwind CSS by default when the user does not specify a styling approach.
- If the user explicitly requests another styling system or a component library, follow that request instead of Tailwind.
- Supported overrides include plain CSS, CSS modules, styled JSX, inline styles, Bootstrap, Material UI, MUI, Chakra UI, Ant Design, shadcn/ui, or other clearly requested UI libraries.
- Build a complete, polished, production-style component rather than a minimal placeholder.
- Do not return bare text-and-border mockups unless the user explicitly asks for something very plain.
- Include realistic structure, spacing, hierarchy, states, and visual styling appropriate to the requested component.
- If the request is for a common UI pattern like a navbar, hero, card, modal, pricing section, or accordion, generate a rich version with sensible content, alignment, hover states, and layout polish.
- When the request is underspecified, make strong but tasteful design decisions instead of keeping it generic.
- Avoid overly basic previews like a single dark bar with plain links unless that is explicitly requested.
- "previewHtml" must be a full HTML document with inline CSS only.
- "previewHtml" must not load external scripts or assets.
- "previewHtml" must visually represent the same component described by "code".
- Make the preview self-contained: no imports, no external fonts, no CDN links, no JavaScript required.
- Use semantic HTML and inline CSS so the preview renders correctly inside a sandboxed iframe.
- The preview should fit comfortably in a medium card-sized viewport and avoid overflowing horizontally.
- Keep the preview self-contained and visually polished.
`

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildFallbackPreview(payload: Pick<CodePayload, "assistantMessage" | "code">) {
  const safeMessage = escapeHtml(payload.assistantMessage || "Generated component preview")
  const safeCode = escapeHtml(payload.code || "No component code was returned.")

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        background: linear-gradient(180deg, #f8fafc 0%, #eef6f8 100%);
        font-family: Inter, Arial, sans-serif;
        color: #0f172a;
      }
      .shell {
        max-width: 920px;
        margin: 0 auto;
        display: grid;
        gap: 16px;
      }
      .card {
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(148, 163, 184, 0.24);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
        padding: 20px;
      }
      .eyebrow {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #64748b;
      }
      h1 {
        margin: 0;
        font-size: 1.2rem;
      }
      p {
        margin: 12px 0 0;
        line-height: 1.6;
        color: #475569;
      }
      pre {
        margin: 0;
        overflow: auto;
        border-radius: 18px;
        background: #0f172a;
        color: #e2e8f0;
        padding: 16px;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="card">
        <p class="eyebrow">Preview fallback</p>
        <h1>${safeMessage}</h1>
        <p>
          The AI did not return a complete visual preview, so this fallback is showing the generated
          component source instead.
        </p>
      </section>
      <section class="card">
        <p class="eyebrow">Generated code</p>
        <pre>${safeCode}</pre>
      </section>
    </div>
  </body>
</html>`
}

function normalizePreviewHtml(payload: Pick<CodePayload, "assistantMessage" | "code" | "previewHtml">) {
  const preview = payload.previewHtml.trim()

  if (!preview) {
    return buildFallbackPreview(payload)
  }

  const lowerPreview = preview.toLowerCase()
  const looksLikeHtmlDocument =
    lowerPreview.includes("<html") &&
    lowerPreview.includes("<body") &&
    lowerPreview.includes("</body>") &&
    lowerPreview.includes("</html>")

  const containsExternalAssets =
    lowerPreview.includes("<script") ||
    lowerPreview.includes("http://") ||
    lowerPreview.includes("https://") ||
    lowerPreview.includes("//fonts.") ||
    lowerPreview.includes("@import url")

  if (!looksLikeHtmlDocument || containsExternalAssets) {
    return buildFallbackPreview(payload)
  }

  return preview
}

function extractJsonObject(value: string) {
  const firstBrace = value.indexOf("{")
  const lastBrace = value.lastIndexOf("}")

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }

  return value.slice(firstBrace, lastBrace + 1)
}

function parseCodePayload(value: string): CodePayload | null {
  try {
    const candidate = extractJsonObject(value)

    if (!candidate) return null

    const parsed = JSON.parse(candidate) as Partial<CodePayload>

    if (
      typeof parsed.assistantMessage !== "string" ||
      typeof parsed.code !== "string" ||
      typeof parsed.previewHtml !== "string"
    ) {
      return null
    }

    return {
      assistantMessage: parsed.assistantMessage.trim(),
      code: parsed.code.trim(),
      previewHtml: parsed.previewHtml.trim(),
    }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENROUTER_API_KEY environment variable." },
      { status: 500 }
    )
  }

  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[]
      mode?: ChatMode
    }

    const messages = body.messages?.filter(
      (message) =>
        typeof message?.content === "string" &&
        message.content.trim().length > 0 &&
        ["system", "user", "assistant"].includes(message.role)
    )

    if (!messages?.length) {
      return Response.json(
        { error: "At least one valid message is required." },
        { status: 400 }
      )
    }

    const mode = body.mode === "code" ? "code" : "chat"
    const outgoingMessages =
      mode === "code"
        ? [{ role: "system", content: codeModePrompt } satisfies ChatMessage, ...messages]
        : messages

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME ?? "AI Components Chat",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
        messages: outgoingMessages,
      }),
      cache: "no-store",
    })

    const data = (await response.json()) as OpenRouterResponse

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message ?? "OpenRouter request failed." },
        { status: response.status }
      )
    }

    const reply = data.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      return Response.json(
        { error: "OpenRouter returned an empty response." },
        { status: 502 }
      )
    }

    if (mode === "code") {
      const payload = parseCodePayload(reply)

      if (!payload) {
        return Response.json(
          {
            error: "The AI response could not be converted into code preview data.",
          },
          { status: 502 }
        )
      }

      return Response.json({
        reply: payload.assistantMessage,
        code: payload.code,
        previewHtml: normalizePreviewHtml(payload),
      })
    }

    return Response.json({ reply })
  } catch {
    return Response.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    )
  }
}
