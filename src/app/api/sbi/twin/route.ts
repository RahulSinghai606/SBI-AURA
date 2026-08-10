import { NextRequest, NextResponse } from "next/server";
import { getLiveTwin } from "@/lib/sbi";
import { ops, killGuard, recordLatency, logEvent } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Assemble the LIVE Digital Twin from SBI core-banking APIs.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const twin = await getLiveTwin();
  recordLatency(Date.now() - t0);
  const okCount = twin.provenance.filter((p) => p.ok).length;
  logEvent("twin-builder", `LIVE twin assembled from ${okCount}/3 SBI core APIs in ${Date.now() - t0}ms`, "info");
  return NextResponse.json(twin);
}
