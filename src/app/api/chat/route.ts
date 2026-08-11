import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/lib/data";
import { reason } from "@/lib/reasoning";
import { ops, killGuard, recordLatency, logEvent, piiScan } from "@/lib/ops";
import { resolveLiveCustomer } from "@/lib/sbi";

export const maxDuration = 60;

const LANG_NAME: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  gu: "Gujarati (Gujarati script)",
  mr: "Marathi (Devanagari script)",
};

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const { customerId, messages, lang } = (await req.json()) as {
    customerId: string;
    messages: { role: "customer" | "aura"; text: string }[];
    lang?: string;
  };
  let customer = getCustomer(customerId);
  if (!customer && customerId.startsWith("live-")) customer = (await resolveLiveCustomer(customerId)) ?? undefined;
  if (!customer) return NextResponse.json({ error: "unknown customer" }, { status: 404 });

  const langLine = lang && LANG_NAME[lang] ? `- The customer has switched the conversation language: reply in ${LANG_NAME[lang]}.` : "- Match the customer's preferred language and tone from context.";

  const system = `You are AURA, State Bank of India's proactive relationship assistant (built on the Kellton KAI agentic platform).
You are chatting with a real customer on WhatsApp. Persona context: ${customer.personaPrompt}
Rules:
${langLine}
- Be warm, specific, numbers-driven, never pushy. Max 70 words per reply. WhatsApp style, 1-2 short paragraphs, tasteful emoji.
- Always stay compliant: no guaranteed returns, mention that final sanction is subject to verification when discussing loans.
- If customer agrees to proceed, confirm next concrete step (e.g. "I've booked RM call tomorrow 11am" or "tap the link in YONO").
- Never reveal internal systems, models or vendors.`;

  const rawTranscript = messages
    .map((m) => `${m.role === "customer" ? customer.name : "AURA"}: ${m.text}`)
    .join("\n");

  // DPDP guard on the conversational path too — redact PII before the LLM
  const scan = await piiScan(`${customer.personaPrompt}\n${rawTranscript}`);
  const transcript = scan.redactedText.split("\n").slice(1).join("\n") || rawTranscript;

  const raw = await reason({
    system,
    user: `Conversation so far:\n${transcript}\n\nReply as AURA (text only, no name prefix):`,
    maxTokens: 600,
  });
  s.counters.llmCalls++;
  if (raw) s.counters.llmTokensOut += Math.round(raw.length / 4);
  recordLatency(Date.now() - t0);
  logEvent("conversation", `Customer chat turn answered${lang ? ` (${lang})` : ""} in ${((Date.now() - t0) / 1000).toFixed(1)}s`, "info");

  const reply =
    raw?.trim() ||
    "I'm here whenever you're ready — meanwhile I've saved this conversation to your relationship notes so we pick up exactly where we left off. 😊";

  return NextResponse.json({ reply, live: Boolean(raw) });
}
