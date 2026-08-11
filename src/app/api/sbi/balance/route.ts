import { NextRequest, NextResponse } from "next/server";
import { getAccountBalance } from "@/lib/sbi";
import { ops, killGuard, recordLatency, logEvent, maskAccount } from "@/lib/ops";

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
    const cached = (result as { cached?: boolean }).cached === true;
    logEvent("sbi-api", `Account Balance ${cached ? "served from last-known-good" : "fetched live"} in ${result.ms}ms`, "info");
    // mask the account number before it leaves the server (DPDP minimisation)
    return NextResponse.json({
      live: !cached,
      cached,
      ms: result.ms,
      message: result.data.message,
      data: {
        corporateAccountNumber: maskAccount(result.data.data.corporateAccountNumber),
        availBalance: result.data.data.availBalance,
        holdValue: result.data.data.holdValue,
        unclearBalance: result.data.data.unclearBalance,
        aPIResRefNo: result.data.data.aPIResRefNo,
      },
    });
  }
  return NextResponse.json({ live: false, error: result.error, ms: result.ms }, { status: 502 });
}
