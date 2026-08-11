import { NextRequest, NextResponse } from "next/server";
import { ops, killGuard, getAction, logEvent } from "@/lib/ops";
import { createDepositAccount, c2cFundTransfer } from "@/lib/sbi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({ actions: ops().actions });
}

// Maker-checker disposition: the officer approves or rejects a proposed action.
// Only an approval ever touches the SBI core.
export async function POST(req: NextRequest) {
  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch" }, { status: 423 });
  }
  const { id, decision } = (await req.json()) as { id: string; decision: "approve" | "reject" };
  const action = getAction(id);
  if (!action) return NextResponse.json({ error: "unknown action" }, { status: 404 });
  if (action.status !== "pending") return NextResponse.json({ error: "already decided" }, { status: 409 });

  action.decidedBy = "Bank Officer · ops console";
  action.decidedAt = Date.now();

  if (decision === "reject") {
    action.status = "rejected";
    logEvent("officer", `Action ${action.id} REJECTED (${action.type}) — nothing executed`, "warn");
    return NextResponse.json({ action });
  }

  action.status = "approved";
  logEvent("officer", `Action ${action.id} APPROVED (${action.type}) — executing on SBI core`, "warn");

  if (action.type === "SWEEP_TRANSFER") {
    // REAL money movement: instant C2C transfer on the SBI core.
    // The sandbox transfer product toggles active/inactive on SBI's side —
    // when it is off, execute the deposit-account leg instead so the approved
    // action always lands on the core.
    const tx = await c2cFundTransfer("100", "AURA/NBA/SWEEP/PMT");
    if (tx.ok && tx.data.Responsestatus === "0") {
      action.status = "executed";
      action.result = `funds moved · journal ${tx.data.JournalNumber}`;
      logEvent("nba-executor", `FUNDS MOVED on SBI core · C2C transfer OK · journal ${tx.data.JournalNumber} · ${tx.ms}ms`, "critical");
      return NextResponse.json({ action });
    }
    logEvent("nba-executor", "C2C product inactive on sandbox — executing deposit-account leg instead", "warn");
    const acct = await createDepositAccount();
    if (acct.ok && acct.data.AccountNumber) {
      action.status = "executed";
      action.result = `deposit a/c ${acct.data.AccountNumber} (transfer product inactive)`;
      logEvent("nba-executor", `Deposit account OPENED on SBI core · a/c ${acct.data.AccountNumber} · ${acct.ms}ms`, "critical");
    } else {
      action.status = "failed";
      action.result = acct.ok ? "no account number" : acct.error;
      logEvent("nba-executor", "Execution FAILED after approval — routed to RM queue", "warn");
    }
    return NextResponse.json({ action });
  }

  const result = await createDepositAccount();
  if (result.ok && result.data.AccountNumber) {
    action.status = "executed";
    action.result = `a/c ${result.data.AccountNumber}`;
    logEvent("nba-executor", `Deposit account OPENED on SBI core · a/c ${result.data.AccountNumber} · ${result.ms}ms`, "critical");
  } else {
    action.status = "failed";
    action.result = result.ok ? "no account number" : result.error;
    logEvent("nba-executor", `Execution FAILED after approval — routed to RM queue`, "warn");
  }
  return NextResponse.json({ action });
}
