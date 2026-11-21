"use client";

import { Bot, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";

type Message = { role: "assistant" | "user"; content: string; mode?: string };

const starter: Message = {
  role: "assistant",
  content:
    "Hi, I’m P’AI. Ask me about Pradyumna’s published projects, experience, skills, or approach to AI systems.",
};

const quickQuestions = [
  "Explain SeatPeekr",
  "Tell me about Pradyumna",
  "What projects are featured?",
  "How does he approach AI systems?",
];

export function PortfolioAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function askQuestion(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setLoading(true);
    try {
      const response = await fetch("/api/portfolio-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = (await response.json()) as { answer?: string; mode?: string };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer ?? "I couldn’t answer that right now.",
          mode:
            data.mode === "live"
              ? "P’AI · AI response"
              : "Portfolio lookup · content-backed response",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I couldn’t answer that right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askQuestion(input);
  }

  function askQuickQuestion(question: string) {
    if (loading) return;
    void askQuestion(question);
  }

  return (
    <div className="portfolio-assistant">
      {open ? (
        <section className="assistant-panel" aria-label="P’AI portfolio guide">
          <header>
            <div className="assistant-title">
              <span className="assistant-icon">
                <Bot size={16} aria-hidden="true" />
              </span>
              <span>
                <strong>P’AI</strong>
                <small>Portfolio guide</small>
              </span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X size={17} />
            </button>
          </header>
          <div className="assistant-note">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Published portfolio only. No private information.</span>
          </div>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`assistant-message assistant-message-${message.role}`}
              >
                <p>{message.content}</p>
                {message.mode && (
                  <small className="mt-2 block text-[10px] opacity-60">{message.mode}</small>
                )}
              </div>
            ))}
            {loading ? (
              <p className="assistant-message assistant-message-assistant">Thinking…</p>
            ) : null}
          </div>
          {messages.length === 1 ? (
            <div className="assistant-prompts">
              <div className="assistant-prompts-label">
                <Sparkles size={13} aria-hidden="true" /> Try a question
              </div>
              <div className="assistant-prompt-grid">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => askQuickQuestion(question)}>
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <form onSubmit={submit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the published portfolio"
              maxLength={600}
              aria-label="Ask P’AI about this portfolio"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send question">
              <Send size={16} />
            </button>
          </form>
        </section>
      ) : null}
      <button
        className="assistant-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open P’AI portfolio guide"
      >
        <Bot size={18} />
      </button>
    </div>
  );
}
