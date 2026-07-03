import { NextRequest, NextResponse } from "next/server";
import { getCustomer, AgentStep, NextBestAction } from "@/lib/data";
import { reason, extractJson } from "@/lib/reasoning";

export const maxDuration = 60;

type SwarmResult = { steps: AgentStep[]; nba: NextBestAction; live: boolean };

const SYSTEM = `You are the multi-agent Reasoning Engine of SBI AURA — an agentic customer-engagement platform for State Bank of India built by Kellton.
You simulate a swarm of five agents analysing one customer's Digital Twin:
1. Sensor Agent — correlates raw signals
2. Life-Event Agent — infers the life/business event & urgency window
3. Risk & Compliance Agent — RBI/DPDP guardrails, suitability, consent
4. Offer Agent — picks ONE next-best-action from realistic SBI products
5. Conversation Agent — drafts the outreach in the customer's preferred language/channel/tone per Twin memory

Respond with STRICT JSON only (no markdown fences) in this exact shape:
{
 "steps": [{"agent": string, "icon": "radar"|"sparkles"|"shield"|"gift"|"message", "finding": string (1-2 sentences, specific numbers), "confidence": number 0-1}],
 "nba": {
   "action": string, "product": string, "rationale": string, "channel": string, "timing": string, "language": string,
   "compliance": [{"rule": string, "status": "pass"|"review"}] (exactly 4),
   "message": string (the actual customer message, in their preferred language, warm + specific, under 90 words, signed "— AURA, your SBI assistant")
 }
}
Use only the data given. Be concrete with numbers. Never invent PII.`;

export async function POST(req: NextRequest) {
  const { customerId } = await req.json();
  const customer = getCustomer(customerId);
  if (!customer) return NextResponse.json({ error: "unknown customer" }, { status: 404 });

  const user = `Digital Twin snapshot:
Name: ${customer.name}, ${customer.age}, ${customer.segment}, ${customer.location}. Language: ${customer.language}.
Products: ${customer.products.join(", ")}. Balance: ${customer.balance}. Relationship: ${customer.relationshipYears} years. YONO active: ${customer.yonoActive}.
Summary: ${customer.twinSummary}
Goals: ${customer.goals.join("; ")}
Live signals:\n${customer.signals.map((s) => `- [${s.type}/${s.strength}] ${s.label}: ${s.detail} (${s.time})`).join("\n")}
Twin memory:\n${customer.memory.map((m) => `- (${m.kind}) ${m.text}`).join("\n")}

Run the 5-agent swarm and return the JSON.`;

  const raw = await reason({ system: SYSTEM, user, maxTokens: 2000 });
  if (raw) {
    const parsed = extractJson<Omit<SwarmResult, "live">>(raw);
    if (parsed?.steps?.length && parsed?.nba?.message) {
      return NextResponse.json({ ...parsed, live: true } satisfies SwarmResult);
    }
  }
  // Resilient fallback so the demo never stalls
  return NextResponse.json({ steps: customer.fallback.steps, nba: customer.fallback.nba, live: false } satisfies SwarmResult);
}
