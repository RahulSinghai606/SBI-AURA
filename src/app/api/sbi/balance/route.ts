import { NextRequest, NextResponse } from "next/server";
import { getAccountBalance } from "@/lib/sbi";
import { ops, killGuard, recordLatency, logEvent } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Live SBI InnoHub sandbox call — proves the twin's balance signal is real.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const { accountNumber } = (await req.json().catch(() => ({}))) as { accountNumber?: string };
  const result = await getAccountBalance(accountNumber);
  recordLatency(Date.now() - t0);
  if (result.ok) {
    logEvent("sbi-api", `Account Balance fetched live from api.innohub.sbi in ${result.ms}ms`, "info");
    return NextResponse.json({ live: true, ms: result.ms, ...result.data });
  }
  return NextResponse.json({ live: false, error: result.error, ms: result.ms }, { status: 502 });
}
