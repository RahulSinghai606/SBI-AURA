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

  // The approved action settles on the SBI core. We try the C2C money-movement
  // leg first; if the sandbox transfer product is off (SBI toggles it), we settle
  // via the Account Creation leg. The audit result states EXACTLY what ran — the
  // recommendation (action.summary) and the settlement leg are logged separately.
  // Writes never serve stale cache. When the SBI write endpoints are still being
  // enabled the leg runs against the schema mock — labelled "simulated", never
  // claimed as a real core settlement (per SBI guidance to mock while pending).
  const tx = await c2cFundTransfer("100", "AURA/NBA/SETTLE");
  const txMock = (tx as { mock?: boolean }).mock === true;
  if (tx.ok && !(tx as { cached?: boolean }).cached && tx.data.Responsestatus === "0") {
    action.status = "executed";
    action.result = `${txMock ? "simulated (schema mock)" : "settled"} via C2C transfer · journal ${tx.data.JournalNumber}`;
    logEvent("nba-executor", `${txMock ? "SIMULATED on schema mock (SBI write API pending)" : "SETTLED on SBI core"} · recommendation "${action.summary}" · C2C transfer journal ${tx.data.JournalNumber} · ${tx.ms}ms`, "critical");
    return NextResponse.json({ action });
  }
  logEvent("nba-executor", "C2C transfer product unavailable — settling via Account Creation leg", "warn");
  const acct = await createDepositAccount();
  const acctMock = (acct as { mock?: boolean }).mock === true;
  if (acct.ok && !(acct as { cached?: boolean }).cached && acct.data.AccountNumber) {
    action.status = "executed";
    action.result = `${acctMock ? "simulated (schema mock)" : "settled"} via Account Creation · a/c ${acct.data.AccountNumber}`;
    logEvent("nba-executor", `${acctMock ? "SIMULATED on schema mock (SBI write API pending)" : "SETTLED on SBI core"} · recommendation "${action.summary}" · new deposit a/c ${acct.data.AccountNumber} · ${acct.ms}ms`, "critical");
  } else {
    action.status = "failed";
    action.result = "core write unavailable — routed to RM queue";
    logEvent("nba-executor", "Execution FAILED after approval — routed to RM queue", "warn");
  }
  return NextResponse.json({ action });
}
