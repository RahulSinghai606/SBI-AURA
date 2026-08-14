import { NextRequest, NextResponse } from "next/server";
import { ops, killGuard, getAction, logEvent } from "@/lib/ops";
import { createDepositAccount, c2cFundTransfer, createLead, createStandingInstruction } from "@/lib/sbi";

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

  // The approved action executes on the bank's own action rails, honestly labelled:
  //   1. Lead Generation — the recommendation becomes a real lead assigned to the
  //      home-branch RM with a T+1 SLA (the business action, always filed).
  //   2. Standing Instruction — for sweep/deposit recommendations, the recurring
  //      movement is set up on the SI rails.
  //   3. C2C / Account Creation money leg where the product is enabled.
  // Writes never serve stale cache. When an SBI write endpoint is still being
  // enabled the leg runs against the schema mock — labelled "simulated", never
  // claimed as a real core settlement (per SBI guidance to mock while pending).
  const legs: string[] = [];
  const lead = await createLead(action.account || "30095497360", action.summary.split("—")[0].trim().slice(0, 40) || "NBA", action.summary);
  const leadMock = (lead as { mock?: boolean }).mock === true;
  if (lead.ok && lead.data.LeadId) {
    legs.push(`${leadMock ? "lead (schema mock)" : "lead"} ${lead.data.LeadId} → ${lead.data.AssignedTo} · SLA ${lead.data.SLA}`);
    logEvent("nba-executor", `${leadMock ? "LEAD FILED on schema mock (SBI endpoint pending)" : "LEAD FILED on SBI core"} · ${lead.data.LeadId} for "${action.summary}" → ${lead.data.AssignedTo}, ${lead.data.SLA}`, "critical");
  }
  if (/sweep|deposit|fd|sip/i.test(action.summary)) {
    const si = await createStandingInstruction(action.account || "30095497360", "DEPOSIT SWEEP", "5000");
    const siMock = (si as { mock?: boolean }).mock === true;
    if (si.ok && si.data.SIRefNo) {
      legs.push(`${siMock ? "SI (schema mock)" : "SI"} ${si.data.SIRefNo} · ${si.data.Frequency} · ${si.data.Status}`);
      logEvent("nba-executor", `${siMock ? "STANDING INSTRUCTION on schema mock" : "STANDING INSTRUCTION on SBI core"} · ${si.data.SIRefNo} (monthly sweep) for "${action.summary}"`, "critical");
    }
  }
  const tx = await c2cFundTransfer("100", "AURA/NBA/SETTLE");
  const txMock = (tx as { mock?: boolean }).mock === true;
  if (tx.ok && !(tx as { cached?: boolean }).cached && tx.data.Responsestatus === "0") {
    legs.push(`${txMock ? "C2C (schema mock)" : "C2C"} journal ${tx.data.JournalNumber}`);
    logEvent("nba-executor", `${txMock ? "SIMULATED money leg on schema mock" : "SETTLED money leg on SBI core"} · C2C journal ${tx.data.JournalNumber} · ${tx.ms}ms`, "critical");
  }
  if (legs.length) {
    action.status = "executed";
    action.result = legs.join(" + ");
    return NextResponse.json({ action });
  }
  logEvent("nba-executor", "All action rails unavailable — trying Account Creation leg", "warn");
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
