// ─────────────────────────────────────────────────────────────
// SBI InnoHub Banking API client — server-side only.
// Live sandbox calls against api.innohub.sbi with the subscribed APIs:
//   Account Balance · Account Statement Enquiry · Account Enquiry ·
//   Customer Information Enquiry · C2C Fund Transfer · NEFT · Account Creation
// Every call is metered on the ops core and falls back to null so the
// demo never stalls if the sandbox is down.
// ─────────────────────────────────────────────────────────────

import { ops, logEvent } from "./ops";

const BASE = process.env.SBI_API_BASE ?? "https://api.innohub.sbi";

type SbiResult<T> = { ok: true; data: T; ms: number } | { ok: false; error: string; ms: number };

async function sbiPost<T>(service: string, path: string, body: Record<string, unknown>): Promise<SbiResult<T>> {
  const t0 = Date.now();
  const s = ops();
  if (!process.env.SBI_API_TOKEN) return { ok: false, error: "SBI_API_TOKEN not configured", ms: 0 };
  try {
    const headers: Record<string, string> = {
      "X-Authorization": process.env.SBI_API_TOKEN,
      "Content-Type": "application/json",
    };
    headers["IH_CODE"] = process.env.SBI_IH_CODE ?? "000073";
    const res = await fetch(`${BASE}/${service}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as T & { ErrorDescription?: string; status?: string };
    s.counters.sbiApiCalls++;
    const ms = Date.now() - t0;
    if (!res.ok || data?.ErrorDescription) {
      s.counters.errors++;
      return { ok: false, error: data?.ErrorDescription ?? `HTTP ${res.status}`, ms };
    }
    logEvent("sbi-api", `${service} responded in ${ms}ms`, "info");
    return { ok: true, data, ms };
  } catch (e) {
    s.counters.errors++;
    return { ok: false, error: e instanceof Error ? e.message : "network error", ms: Date.now() - t0 };
  }
}

export type SbiBalance = {
  message: string;
  data: {
    corporateAccountNumber: string;
    bookBalance: string;
    availBalance: string;
    holdValue: string;
    unclearBalance: string;
    aPIResRefNo: string;
  };
  status: string;
  statusCode: string;
};

// Live balance from the SBI sandbox — the Digital Twin's financial snapshot signal.
export function getAccountBalance(accountNumber = "00000030002046100", corporateID = "1105") {
  return sbiPost<SbiBalance>("getAccountBalance/v1", "/getAccountBalance", {
    aPIReqRefNo: `AURAREQ${Date.now()}`,
    corporateAccountNumber: accountNumber,
    corporateID,
  });
}

// Transaction history — feeds salary/spend/life-event inference.
export function getAccountStatement(accountNumber = "30095497360", fromDate = "25022019", toDate = "25022019") {
  return sbiPost<Record<string, unknown>>("accstatementenq/v1", "/accounts", {
    AccountNumber: accountNumber,
    FromDate: fromDate,
    ToDate: toDate,
    Verbose: "0",
  });
}

// Account details of an existing customer.
export function getAccountEnquiry(accountNumber = "30002709704") {
  return sbiPost<Record<string, unknown>>("accountenquiryapi/v1", "/accounts", { AccountNumber: accountNumber });
}

// Personal details — the twin's identity layer. Verified live: returns
// customer name, cleared balance and recent transactions.
export function getCustomerInfo(accountNumber = "30095497360") {
  return sbiPost<{ CustomerName: string; TotalBalanceClearedBalance: string; NumberOfTransactions: string }>(
    "customerinformationenquiry/v1",
    "/enquiry",
    { AccountNumber: accountNumber }
  );
}

// Open a new deposit account on the SBI core — the "idle balance → deposit"
// flagship action. Verified live: returns the freshly created account number.
export function createDepositAccount() {
  return sbiPost<{ ResponseStatus: string; AccountNumber: string }>("accountcreation/v1", "/customers", {});
}

// NOTE: the C2C and NEFT fund-transfer sandbox backends currently reject their
// own published request schemas (SI520 on every spec field — verified 10 Aug 2026),
// so the money-movement action demos through Account Creation instead.
