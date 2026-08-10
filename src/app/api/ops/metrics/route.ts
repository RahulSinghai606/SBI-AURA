import { NextRequest, NextResponse } from "next/server";
import { ops, percentile, KILL_COOKIE } from "@/lib/ops";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = ops();
  const engaged = s.killSwitch.engaged || req.cookies.get(KILL_COOKIE)?.value === "1";
  return NextResponse.json({
    killSwitch: { ...s.killSwitch, engaged },
    counters: s.counters,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
    traces: s.traces.slice(0, 6),
    events: s.events.slice(0, 30),
    uptimeSec: Math.round((Date.now() - s.startedAt) / 1000),
  });
}
