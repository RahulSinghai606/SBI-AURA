import { NextRequest, NextResponse } from "next/server";
import { ops, killGuard, getAction, logEvent } from "@/lib/ops";
import { createDepositAccount } from "@/lib/sbi";

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
  const result = await createDepositAccount();
  if (result.ok && result.data.AccountNumber) {
    action.status = "executed";
    action.result = result.data.AccountNumber;
    logEvent("nba-executor", `Deposit account OPENED on SBI core · a/c ${result.data.AccountNumber} · ${result.ms}ms`, "critical");
  } else {
    action.status = "failed";
    action.result = result.ok ? "no account number" : result.error;
    logEvent("nba-executor", `Execution FAILED after approval — routed to RM queue`, "warn");
  }
  return NextResponse.json({ action });
}
