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
- "previewHtml" must be a full HTML document with inline CSS only.
- "previewHtml" must not load external scripts or assets.
- Keep the preview self-contained and visually polished.
`

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
        previewHtml: payload.previewHtml,
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
