"use client";

import { Bot, Send, X } from "lucide-react";
import { FormEvent, useState } from "react";

type Message = { role: "assistant" | "user"; content: string };

const starter: Message = {
  role: "assistant",
  content: "Ask me about Pradyumna’s projects, experience, or approach to reliable AI systems.",
};

export function PortfolioAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
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
      const data = (await response.json()) as { answer?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.answer ?? "I couldn’t answer that right now." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn’t answer that right now." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portfolio-assistant">
      {open ? (
        <section className="assistant-panel" aria-label="Portfolio assistant">
          <header>
            <div><Bot size={17} aria-hidden="true" /><span>Portfolio assistant</span></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={17} /></button>
          </header>
          <p className="assistant-note">Answers are grounded only in this published portfolio.</p>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => <p key={`${message.role}-${index}`} className={`assistant-message assistant-message-${message.role}`}>{message.content}</p>)}
            {loading ? <p className="assistant-message assistant-message-assistant">Thinking…</p> : null}
          </div>
          <form onSubmit={submit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about the finance tracker" maxLength={600} aria-label="Ask about this portfolio" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send question"><Send size={16} /></button>
          </form>
        </section>
      ) : null}
<button
  className="assistant-trigger"
  type="button"
  onClick={() => setOpen(true)}
  aria-label="Open P'AI Assistant"
>
  <Bot size={18} />
  Ask P&apos;AI
</button>
    </div>
  );
}
