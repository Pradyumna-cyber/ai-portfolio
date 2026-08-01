import { NextResponse } from "next/server";

import { getLocalPortfolioAnswer, getPortfolioContext } from "@/lib/portfolio-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message || message.length > 600) {
    return NextResponse.json({ answer: "Please ask a short question about the published portfolio." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ answer: getLocalPortfolioAnswer(message) });

  const instructions = `You are the portfolio assistant for Pradyumna Aher. Answer ONLY from the supplied portfolio context. Do not invent metrics, employers, projects, dates, links, or skills. If the answer is not in the context, say that it is not published in this portfolio. Be concise, helpful, and speak in third person.\n\nPORTFOLIO CONTEXT:\n${getPortfolioContext()}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_PORTFOLIO_MODEL ?? "gpt-4.1-mini",
        instructions,
        input: message,
        max_output_tokens: 280,
      }),
    });
    if (!response.ok) return NextResponse.json({ answer: getLocalPortfolioAnswer(message) });
    const data = (await response.json()) as { output_text?: unknown };
    const answer = typeof data.output_text === "string" ? data.output_text.trim() : "";
    return NextResponse.json({ answer: answer || getLocalPortfolioAnswer(message) });
  } catch {
    return NextResponse.json({ answer: getLocalPortfolioAnswer(message) });
  }
}
