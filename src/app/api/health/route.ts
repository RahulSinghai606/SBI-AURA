import { NextResponse } from "next/server";
import { ops, recordLatency } from "@/lib/ops";

export const dynamic = "force-dynamic";

// Lightweight health probe — also the target for the /ops live load test.
export async function GET() {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;
  // small deterministic work so latencies are honest, not zero
  let x = 0;
  for (let i = 0; i < 20000; i++) x = (x + i * 31) % 997;
  const ms = Date.now() - t0;
  recordLatency(ms);
  return NextResponse.json({ ok: true, ms, kill: s.killSwitch.engaged });
}
