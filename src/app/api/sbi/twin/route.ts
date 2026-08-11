import { NextRequest, NextResponse } from "next/server";
import { buildLiveTwin } from "@/lib/sbi";
import { ops, killGuard, recordLatency, logEvent } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Assemble one LIVE Digital Twin from SBI core-banking APIs.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const twin = await buildLiveTwin("30095497360", "senior_premium");
  recordLatency(Date.now() - t0);
  logEvent("twin-builder", `LIVE twin assembled in ${Date.now() - t0}ms`, "info");
  return NextResponse.json(twin);
}
