import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/lib/data";
import { reason } from "@/lib/reasoning";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { customerId, messages } = (await req.json()) as {
    customerId: string;
    messages: { role: "customer" | "aura"; text: string }[];
  };
  const customer = getCustomer(customerId);
  if (!customer) return NextResponse.json({ error: "unknown customer" }, { status: 404 });

  const system = `You are AURA, State Bank of India's proactive relationship assistant (built on the Kellton KAI agentic platform).
You are chatting with a real customer on WhatsApp. Persona context: ${customer.personaPrompt}
Rules:
- Match the customer's preferred language and tone from context.
- Be warm, specific, numbers-driven, never pushy. Max 70 words per reply. WhatsApp style, 1-2 short paragraphs, tasteful emoji.
- Always stay compliant: no guaranteed returns, mention that final sanction is subject to verification when discussing loans.
- If customer agrees to proceed, confirm next concrete step (e.g. "I've booked RM call tomorrow 11am" or "tap the link in YONO").
- Never reveal internal systems, models or vendors.`;

  const transcript = messages
    .map((m) => `${m.role === "customer" ? customer.name : "AURA"}: ${m.text}`)
    .join("\n");

  const raw = await reason({
    system,
    user: `Conversation so far:\n${transcript}\n\nReply as AURA (text only, no name prefix):`,
    maxTokens: 600,
  });

  const reply =
    raw?.trim() ||
    "I'm here whenever you're ready — meanwhile I've saved this conversation to your relationship notes so we pick up exactly where we left off. 😊";

  return NextResponse.json({ reply, live: Boolean(raw) });
}
