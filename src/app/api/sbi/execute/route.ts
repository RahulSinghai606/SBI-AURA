import { NextRequest, NextResponse } from "next/server";
import { createDepositAccount } from "@/lib/sbi";
import { ops, killGuard, recordLatency, logEvent } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Execute the approved next-best-action on the SBI core: open the deposit
// account for real through the InnoHub Account Creation API.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const result = await createDepositAccount();
  recordLatency(Date.now() - t0);
  if (result.ok && result.data.AccountNumber) {
    logEvent("nba-executor", `Deposit account OPENED on SBI core · a/c ${result.data.AccountNumber} · ${result.ms}ms`, "warn");
    return NextResponse.json({ live: true, accountNumber: result.data.AccountNumber, ms: result.ms });
  }
  logEvent("nba-executor", "Account creation attempt failed — routed to RM queue", "warn");
  return NextResponse.json({ live: false, error: result.ok ? "no account number" : result.error, ms: result.ms }, { status: 502 });
}
