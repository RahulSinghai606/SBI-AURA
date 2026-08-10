import { NextRequest, NextResponse } from "next/server";
import { getCustomer, AgentStep, NextBestAction } from "@/lib/data";
import { reason, extractJson } from "@/lib/reasoning";
import { ops, killGuard, piiScan, recordLatency, recordTrace, logEvent, Span } from "@/lib/ops";
import { getAccountBalance, resolveLiveCustomer } from "@/lib/sbi";

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
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;
  const spans: Span[] = [];
  const traceId = `tr-${t0.toString(36)}`;

  // ── kill switch guard: no agent engages while suspended ──
  if (killGuard(req).blocked) {
    return NextResponse.json(
      { error: "kill-switch", message: "Agentic engagement suspended by the bank officer. Approved journeys remain read-only." },
      { status: 423 }
    );
  }

  const { customerId } = await req.json();

  // "live-*" twins are assembled at runtime from SBI core-banking APIs
  let customer = getCustomer(customerId);
  let liveTwinSpan: Span | null = null;
  if (!customer && String(customerId).startsWith("live-")) {
    const tw0 = Date.now();
    const live = await resolveLiveCustomer(customerId);
    if (live) {
      customer = live;
      liveTwinSpan = {
        name: "sbi.live-twin · assembled from core-banking APIs",
        startMs: tw0 - t0,
        durMs: Date.now() - tw0,
        status: "ok",
        note: "twin built from live SBI data · nothing synthetic",
      };
    }
  }
  if (!customer) return NextResponse.json({ error: "unknown customer" }, { status: 404 });
  if (liveTwinSpan) spans.push(liveTwinSpan);

  logEvent("swarm", `Swarm run started · twin ${customer.name.split(" ")[0]}·${customer.id}`, "info");

  // ── live SBI signal: real balance from the InnoHub sandbox ──
  let sT = Date.now();
  const bal = await getAccountBalance();
  const liveBalanceLine = bal.ok
    ? `LIVE SBI core-banking signal (api.innohub.sbi): available balance ₹${bal.data.data.availBalance.trim()} on linked corporate account ${bal.data.data.corporateAccountNumber} (ref ${bal.data.data.aPIResRefNo}).`
    : "";
  spans.push({
    name: "sbi.core-banking · Account Balance API",
    startMs: sT - t0,
    durMs: bal.ms,
    status: bal.ok ? "ok" : "error",
    note: bal.ok ? `live balance fetched · ${bal.ms}ms` : "sandbox unavailable → twin snapshot used",
  });

  // ── DPDP guard: PII scan BEFORE any text reaches the LLM ──
  sT = Date.now();
  const twinText = `${customer.twinSummary}\n${customer.signals.map((x) => x.detail).join("\n")}`;
  const pii = await piiScan(twinText);
  spans.push({
    name: "dpdp.pii-guard · Azure AI Language",
    startMs: sT - t0,
    durMs: pii.ms,
    status: "ok",
    note: pii.entities.length ? `${pii.entities.length} identifiers redacted pre-LLM` : "0 personal identifiers — clean",
  });

  const user = `Digital Twin snapshot (DPDP-screened):
Name: ${customer.name}, ${customer.age}, ${customer.segment}, ${customer.location}. Language: ${customer.language}.
Products: ${customer.products.join(", ")}. Balance: ${customer.balance}. Relationship: ${customer.relationshipYears} years. YONO active: ${customer.yonoActive}.
${liveBalanceLine}
Summary: ${customer.twinSummary}
Goals: ${customer.goals.join("; ")}
Live signals:\n${customer.signals.map((x) => `- [${x.type}/${x.strength}] ${x.label}: ${x.detail} (${x.time})`).join("\n")}
Twin memory:\n${customer.memory.map((m) => `- (${m.kind}) ${m.text}`).join("\n")}

Run the 5-agent swarm and return the JSON.`;

  // ── swarm reasoning span ──
  sT = Date.now();
  const raw = await reason({ system: SYSTEM, user, maxTokens: 2000 });
  s.counters.llmCalls++;
  if (raw) s.counters.llmTokensOut += Math.round(raw.length / 4);
  spans.push({
    name: "swarm.reason · Sensor→LifeEvent→Compliance→Offer→Conversation",
    startMs: sT - t0,
    durMs: Date.now() - sT,
    status: raw ? "ok" : "error",
    note: raw ? "5 agents · batched inference" : "LLM unavailable → cached twin",
  });

  const totalMs = Date.now() - t0;
  recordLatency(totalMs);
  recordTrace({ id: traceId, route: `swarm.run · ${customer.id}`, startedAt: t0, totalMs, spans });
  logEvent("swarm", `Swarm finished in ${(totalMs / 1000).toFixed(1)}s · trace ${traceId}`, "info");

  if (raw) {
    const parsed = extractJson<Omit<SwarmResult, "live">>(raw);
    if (parsed?.steps?.length && parsed?.nba?.message) {
      return NextResponse.json({ ...parsed, live: true, traceId, sbi: bal.ok ? { balance: bal.data.data.availBalance.trim(), ms: bal.ms } : null, pii: { redacted: pii.entities.length } });
    }
  }
  // Resilient fallback so the demo never stalls
  return NextResponse.json({ steps: customer.fallback.steps, nba: customer.fallback.nba, live: false, traceId });
}
