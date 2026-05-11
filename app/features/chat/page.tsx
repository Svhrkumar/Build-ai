"use client"

import dynamic from "next/dynamic"
import React, { useMemo, useState } from "react"
import Card from "@/app/common/Card"
import useLocalStorage from "@/app/hooks/useLocalStorage"
import { FaRegCopy } from "react-icons/fa"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
})

type ChatMessage = {
  id: number
  text: string
  sender: "user" | "bot"
}

const starterMessage: ChatMessage = {
  id: 1,
  text: "Hello. Describe the component you want, the style direction, and any interactions you need.",
  sender: "bot",
}

const starterCode = `export default function GeneratedComponent() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Component preview</h2>
      <p className="mt-2 text-sm text-slate-600">
        Switch to split view and ask for a component to generate code and a live preview here.
      </p>
    </section>
  )
}`

const starterPreviewHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, #f8fafc 0%, #eef6f8 100%);
        font-family: Inter, Arial, sans-serif;
        color: #0f172a;
      }
      .card {
        width: min(420px, calc(100vw - 32px));
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.24);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
        padding: 24px;
      }
      h1 {
        margin: 0;
        font-size: 1.25rem;
      }
      p {
        margin: 12px 0 0;
        line-height: 1.6;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Component preview</h1>
      <p>Ask for a UI in split view mode to render the generated result here.</p>
    </div>
  </body>
</html>`

const codeSkeletonLines = [
  "w-[92%]",
  "w-[74%]",
  "w-[88%]",
  "w-[64%]",
  "w-[82%]",
  "w-[70%]",
  "w-[58%]",
  "w-[86%]",
]

const ChatPage = () => {
  const [messages, setMessages] = useLocalStorage("chat-messages", [starterMessage])
  const [agentMode, setAgentMode] = useState<"chat" | "code">("chat")
  const [rightPanelTab, setRightPanelTab] = useState<"code" | "preview">("code")
  const [generatedCode, setGeneratedCode] = useLocalStorage("generated-component-code", starterCode)
  const [previewHtml, setPreviewHtml] = useLocalStorage("generated-component-preview", starterPreviewHtml)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const stats = useMemo(
    () => ({
      messageCount: messages.length,
      promptCount: messages.filter((message) => message.sender === "user").length,
    }),
    [messages]
  )

  const handleSend = async () => {
    const trimmedInput = input.trim()

    if (!trimmedInput || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: trimmedInput,
      sender: "user",
    }

    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput("")
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: agentMode,
          messages: nextMessages.map((message) => ({
            role: message.sender === "user" ? "user" : "assistant",
            content: message.text,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response.")
      }

      if (agentMode === "code") {
        setGeneratedCode(typeof data.code === "string" ? data.code : starterCode)
        setPreviewHtml(typeof data.previewHtml === "string" ? data.previewHtml : starterPreviewHtml)
      }

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: data.reply,
          sender: "bot",
        },
      ])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setMessages([starterMessage])
    setGeneratedCode(starterCode)
    setPreviewHtml(starterPreviewHtml)
    setError("")
    setCopied(false)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Could not copy the generated code.")
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
        <Card classNames="overflow-hidden p-0">
          <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#18314f_0%,#1c7c7d_55%,#8dd8d1_100%)] px-6 py-7 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_30%)]" />
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                    Conversational Builder
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    Design components by talking through them.
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-white/78">
                    Keep layout ideas, behavior notes, and visual direction in one place while the
                    assistant helps shape the component.
                  </p>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/65">Messages</p>
                    <p className="mt-2 text-2xl font-semibold">{stats.messageCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/65">Prompts</p>
                    <p className="mt-2 text-2xl font-semibold">{stats.promptCount}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    agentMode === "chat"
                      ? "bg-white text-slate-900 shadow-lg"
                      : "border border-white/25 bg-white/10 text-white/85"
                  }`}
                  onClick={() => setAgentMode("chat")}
                  type="button"
                >
                  Chat focus
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    agentMode === "code"
                      ? "bg-white text-slate-900 shadow-lg"
                      : "border border-white/25 bg-white/10 text-white/85"
                  }`}
                  onClick={() => {
                    setAgentMode("code")
                    setRightPanelTab("code")
                  }}
                  type="button"
                >
                  Split view
                </button>
                <button
                  className="rounded-full border border-white/25 bg-transparent px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
                  onClick={handleReset}
                  type="button"
                >
                  Reset chat
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card classNames="p-6">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                Suggested prompt frame
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">Tell the assistant what to build.</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                Component: pricing card, settings modal, analytics chart card
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                Style: editorial, minimal, playful, enterprise, glassmorphism
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                Behavior: validation, filters, tabs, animations, empty states
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                Styling tech: Tailwind, CSS modules, styled JSX, inline styles, plain CSS
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className={`grid gap-6 ${agentMode === "code" ? "lg:grid-cols-[1.15fr_0.85fr]" : "lg:grid-cols-1"}`}>
        <Card classNames="flex min-h-[620px] flex-col p-5 lg:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live chat</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Component planning thread</h3>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm text-slate-600">
              {isLoading ? "Assistant is thinking" : "Ready for your next prompt"}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 lg:p-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[24px] px-4 py-3 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[linear-gradient(135deg,#1c7c7d,#2c9f98)] text-white"
                      : "border border-[var(--border)] bg-white text-slate-800"
                  }`}
                >
                  <p
                    className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      msg.sender === "user" ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    {msg.sender === "user" ? "You" : "Assistant"}
                  </p>
                  <p className="text-sm leading-6 whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[24px] border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Assistant
                  </p>
                  <div className="flex gap-2">
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.2s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.1s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 rounded-[28px] border border-[var(--border)] bg-white/85 p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="flex-1">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Prompt
                </span>
                <textarea
                  className="min-h-[120px] w-full resize-none rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white"
                  placeholder="Describe the component, interactions, layout, and visual mood..."
                  rows={4}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </label>

              <button
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18314f,#1c7c7d)] px-6 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(24,49,79,0.25)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSend}
                disabled={isLoading}
                type="button"
              >
                {isLoading ? "Sending..." : "Send prompt"}
              </button>
            </div>
          </div>
        </Card>

        {agentMode === "code" && (
          <Card classNames="min-h-[620px] p-5 lg:p-6">
            <div className="flex h-full flex-col">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Builder output</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Code editor and live preview</h3>
                </div>
               
              </div>
                <div className="mb-3 flex items-center gap-3 justify-center">
                  <div className="relative grid grid-cols-2 rounded-full border border-slate-200 bg-slate-100 p-1">
                    <div
                      className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
                        rightPanelTab === "code" ? "translate-x-0" : "translate-x-full"
                      }`}
                    />
                    <button
                      className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-300 cursor-pointer ${
                        rightPanelTab === "code"
                          ? "text-slate-900"
                          : "text-slate-500"
                      }`}
                      onClick={() => setRightPanelTab("code")}
                      type="button"
                    >
                      Code
                    </button>
                    <button
                      className={`relative z-10 rounded-full px-3 py-2 width-auto text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-300 cursor-pointer ${
                        rightPanelTab === "preview"
                          ? "text-slate-900"
                          : "text-slate-500"
                      }`}
                      onClick={() => setRightPanelTab("preview")}
                      type="button"
                    >
                      Component
                    </button>
                  </div>
            
                </div>
              <div className="grid flex-1 gap-4">
                {isLoading && agentMode === "code" ? (
                  rightPanelTab === "code" ? (
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Generating code</p>
                          <p className="mt-1 text-sm text-slate-300">Building a fresh component response...</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                          Loading
                        </span>
                      </div>
                      <div className="space-y-4 px-4 py-5">
                        {codeSkeletonLines.map((widthClass, index) => (
                          <div
                            key={`${widthClass}-${index}`}
                            className={`h-4 rounded-full bg-white/10 ${widthClass} animate-pulse`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                        <p className="text-xs text-slate-400">
                          Preparing the generated component code for your editor.
                        </p>
                        <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Generating preview</p>
                          <p className="mt-1 text-sm text-slate-600">Rendering the component mockup...</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Loading
                        </span>
                      </div>
                      <div className="space-y-4 p-6">
                        <div className="h-10 w-40 animate-pulse rounded-full bg-slate-200" />
                        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                          <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-6 grid grid-cols-2 gap-3">
                            <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                            <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : rightPanelTab === "code" ? (
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 shadow-[0_20px_40px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Generated code</p>
                        <p className="mt-1 text-sm text-slate-300">The assistant writes component code here.</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                        JSX
                      </span>
                    </div>
                    <MonacoEditor
                      height="584px"
                      defaultLanguage="typescript"
                      language="typescript"
                      theme="vs-dark"
                      value={generatedCode}
                      onChange={(value) => setGeneratedCode(value ?? "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        lineNumbersMinChars: 3,
                        roundedSelection: true,
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                      }}
                    />
                    <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                      <p className="text-xs text-slate-400">
                        Copy the generated component code for reuse in your app.
                      </p>
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
                        onClick={handleCopyCode}
                        type="button"
                      >
                        <FaRegCopy className="text-sm" />
                        {copied ? "Copied" : "Copy code"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-out">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live preview</p>
                        <p className="mt-1 text-sm text-slate-600">Rendered from the generated component preview HTML.</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Sandbox
                      </span>
                    </div>
                    <iframe
                      className="h-[584px] w-full bg-white"
                      sandbox=""
                      srcDoc={previewHtml}
                      title="Generated component preview"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </section>
    </main>
  )
}

export default ChatPage
