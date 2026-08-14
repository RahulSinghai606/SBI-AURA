import { NextRequest, NextResponse } from "next/server";
import { ops, killGuard, recordLatency, proposeAction, logEvent } from "@/lib/ops";
import { sendConsentOtp, verifyConsentOtp } from "@/lib/sbi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// DPDP consent ceremony + maker-checker proposal.
// Step 1 (no otp): an OTP is issued to the customer's registered mobile on the
//   SBI OTP rails — the customer, not the bank, authorises the engagement.
// Step 2 (otp): OTP verified on the core → the action is PROPOSED onto the
//   maker-checker queue with the consent reference attached. A human officer
//   must still approve it on /ops before the SBI core is touched.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const s = ops();
  s.counters.requests++;

  if (killGuard(req).blocked) {
    return NextResponse.json({ error: "kill-switch", message: "Agentic engagement suspended." }, { status: 423 });
  }

  const { customer, account, summary, otp } = (await req.json().catch(() => ({}))) as {
    customer?: string;
    account?: string;
    summary?: string;
    otp?: string;
  };
  const acct = account || "30095497360";

  // ── Step 1: issue the consent OTP ──
  if (!otp) {
    const sent = await sendConsentOtp(acct);
    if (!sent.ok) return NextResponse.json({ error: "otp-unavailable" }, { status: 502 });
    logEvent("dpdp-consent", `Consent OTP issued to ${sent.data.DeliveredTo} (ref ${sent.data.OTPRefNo}) — customer authorises the engagement, not the bank`, "info");
    recordLatency(Date.now() - t0);
    return NextResponse.json({
      consentPending: true,
      otpRef: sent.data.OTPRefNo,
      deliveredTo: sent.data.DeliveredTo,
      validitySecs: sent.data.ValiditySecs,
      mock: (sent as { mock?: boolean }).mock === true,
    });
  }

  // ── Step 2: verify consent, then propose onto the maker-checker queue ──
  const ver = await verifyConsentOtp(acct, otp);
  if (!ver.ok || ver.data.Verified !== "Y") {
    logEvent("dpdp-consent", "Consent OTP mismatch — engagement NOT proposed", "warn");
    return NextResponse.json({ error: "otp-mismatch" }, { status: 401 });
  }
  logEvent("dpdp-consent", `Customer consent VERIFIED on SBI OTP rails (consent ref ${ver.data.ConsentRefNo}) — DPDP purpose-bound`, "info");

  const action = proposeAction(
    "SWEEP_TRANSFER",
    `${summary ?? "Agent-recommended action"} · consent ${ver.data.ConsentRefNo}`,
    customer ?? "Customer",
    acct
  );
  recordLatency(Date.now() - t0);
  return NextResponse.json({ proposed: true, action, consentRef: ver.data.ConsentRefNo });
}
