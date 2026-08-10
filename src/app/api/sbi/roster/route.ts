import { NextRequest, NextResponse } from "next/server";
import { getLiveRoster } from "@/lib/sbi";
import { ops, killGuard, recordLatency, logEvent } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The LIVE customer roster — every entry assembled from SBI core-banking APIs.
export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch" }, { status: 423 });
  }

  const roster = await getLiveRoster();
  recordLatency(Date.now() - t0);
  logEvent("twin-builder", `Live roster assembled: ${roster.length} real relationships in ${Date.now() - t0}ms`, "info");
  return NextResponse.json({ roster });
}
