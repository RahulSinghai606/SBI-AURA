import { NextRequest, NextResponse } from "next/server";
import { ops, percentile, KILL_COOKIE } from "@/lib/ops";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = ops();
  const engaged = s.killSwitch.engaged || req.cookies.get(KILL_COOKIE)?.value === "1";
  // Business KPIs — outcomes, not just plumbing: what the swarm found, what
  // officers approved, and what landed on the bank's action rails.
  const acts = s.actions;
  const decided = acts.filter((a) => a.status !== "pending");
  const executed = acts.filter((a) => a.status === "executed");
  const kpi = {
    opportunitiesProposed: acts.length,
    officerApprovalRate: decided.length ? Math.round((executed.length / decided.length) * 100) : null,
    leadsFiled: executed.filter((a) => /lead/i.test(a.result ?? "")).length,
    standingInstructions: executed.filter((a) => /\bSI\b/.test(a.result ?? "")).length,
    consentVerified: s.events.filter((e) => /consent VERIFIED/i.test(e.action)).length,
    pendingReview: acts.filter((a) => a.status === "pending").length,
  };
  return NextResponse.json({
    killSwitch: { ...s.killSwitch, engaged },
    counters: s.counters,
    kpi,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
    traces: s.traces.slice(0, 6),
    events: s.events.slice(0, 30),
    dataEvents: s.dataEvents.slice(0, 15),
    actions: s.actions.slice(0, 10),
    uptimeSec: Math.round((Date.now() - s.startedAt) / 1000),
  });
}
