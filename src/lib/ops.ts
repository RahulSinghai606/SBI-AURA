// ─────────────────────────────────────────────────────────────
// AURA Ops Core — kill switch, metrics, distributed traces and
// the operations audit stream. In-memory singleton for the demo;
// production maps 1:1 to Redis/OTel/Prometheus + an append-only store.
// ─────────────────────────────────────────────────────────────

export type Span = { name: string; startMs: number; durMs: number; status: "ok" | "error" | "blocked"; note?: string };
export type Trace = { id: string; route: string; startedAt: number; totalMs: number; spans: Span[] };
export type OpsEvent = { seq: number; at: number; actor: string; action: string; severity: "info" | "warn" | "critical" };

type OpsState = {
  killSwitch: { engaged: boolean; by: string; at: number | null; reason: string };
  counters: {
    requests: number;
    llmCalls: number;
    llmTokensOut: number;
    piiScans: number;
    piiEntitiesRedacted: number;
    sbiApiCalls: number;
    blockedByKill: number;
    errors: number;
  };
  latencies: number[]; // last 200 request latencies (ms)
  traces: Trace[]; // last 20
  events: OpsEvent[]; // last 100
  seq: number;
  startedAt: number;
};

// survive Next.js dev/module reloads via globalThis
const g = globalThis as unknown as { __auraOps?: OpsState };

function init(): OpsState {
  return {
    killSwitch: { engaged: false, by: "", at: null, reason: "" },
    counters: { requests: 0, llmCalls: 0, llmTokensOut: 0, piiScans: 0, piiEntitiesRedacted: 0, sbiApiCalls: 0, blockedByKill: 0, errors: 0 },
    latencies: [],
    traces: [],
    events: [],
    seq: 5120,
    startedAt: Date.now(),
  };
}

export function ops(): OpsState {
  if (!g.__auraOps) {
    g.__auraOps = init();
    logEvent("system", "AURA control plane started · agent swarm ACTIVE", "info");
  }
  return g.__auraOps;
}

export function logEvent(actor: string, action: string, severity: OpsEvent["severity"] = "info") {
  const s = g.__auraOps ?? (g.__auraOps = init());
  s.events.unshift({ seq: ++s.seq, at: Date.now(), actor, action, severity });
  if (s.events.length > 100) s.events.pop();
}

export function recordLatency(ms: number) {
  const s = ops();
  s.latencies.push(ms);
  if (s.latencies.length > 200) s.latencies.shift();
}

export function recordTrace(t: Trace) {
  const s = ops();
  s.traces.unshift(t);
  if (s.traces.length > 20) s.traces.pop();
}

export function percentile(p: number): number {
  const l = [...ops().latencies].sort((a, b) => a - b);
  if (!l.length) return 0;
  return Math.round(l[Math.min(l.length - 1, Math.floor((p / 100) * l.length))]);
}

export function setKill(engaged: boolean, by: string, reason: string) {
  const s = ops();
  s.killSwitch = { engaged, by, at: Date.now(), reason };
  logEvent(
    by,
    engaged
      ? `KILL SWITCH ENGAGED — all agentic engagement suspended (${reason})`
      : "Kill switch released — agentic engagement resumed after review",
    engaged ? "critical" : "warn"
  );
}

// A cookie backs the in-memory flag so the switch also holds
// across serverless instances (each lambda has its own globalThis).
export const KILL_COOKIE = "aura-kill";

export function killGuard(req?: { cookies: { get(name: string): { value: string } | undefined } }): { blocked: boolean } {
  const s = ops();
  const cookieKill = req?.cookies.get(KILL_COOKIE)?.value === "1";
  if (s.killSwitch.engaged || cookieKill) {
    s.counters.blockedByKill++;
    logEvent("kill-switch", "Agent invocation BLOCKED — engagement suspended", "warn");
    return { blocked: true };
  }
  return { blocked: false };
}

// DPDP guard — Azure AI Language PII detection over text before it reaches any LLM.
export async function piiScan(text: string): Promise<{ redactedText: string; entities: { text: string; category: string }[]; ms: number }> {
  const s = ops();
  const t0 = Date.now();
  try {
    const res = await fetch(`${process.env.AZURE_COG_ENDPOINT}/language/:analyze-text?api-version=2023-04-01`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_AI_KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "PiiEntityRecognition",
        parameters: { modelVersion: "latest" },
        analysisInput: { documents: [{ id: "1", language: "en", text: text.slice(0, 5000) }] },
      }),
    });
    const data = await res.json();
    const doc = data?.results?.documents?.[0];
    s.counters.piiScans++;
    const entities = (doc?.entities ?? []).map((e: { text: string; category: string }) => ({ text: e.text, category: e.category }));
    s.counters.piiEntitiesRedacted += entities.length;
    return { redactedText: doc?.redactedText ?? text, entities, ms: Date.now() - t0 };
  } catch {
    s.counters.errors++;
    return { redactedText: text, entities: [], ms: Date.now() - t0 };
  }
}
