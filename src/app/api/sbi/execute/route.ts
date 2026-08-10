import { NextRequest, NextResponse } from "next/server";
import { ops, killGuard, recordLatency, proposeAction } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The agent PROPOSES the action; it lands on the maker-checker queue.
// A human officer must approve it on /ops before the SBI core is touched.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const { customer, account, summary } = (await req.json().catch(() => ({}))) as {
    customer?: string;
    account?: string;
    summary?: string;
  };
  const action = proposeAction(
    "OPEN_DEPOSIT_ACCOUNT",
    summary ?? "Open deposit account for idle balance (agent-recommended)",
    customer ?? "Customer",
    account ?? ""
  );
  recordLatency(Date.now() - t0);
  return NextResponse.json({ proposed: true, action });
}
