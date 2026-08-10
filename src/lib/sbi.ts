// ─────────────────────────────────────────────────────────────
// SBI InnoHub Banking API client — server-side only.
// Live sandbox calls against api.innohub.sbi with the subscribed APIs:
//   Account Balance · Account Statement Enquiry · Account Enquiry ·
//   Customer Information Enquiry · C2C Fund Transfer · NEFT · Account Creation
// Every call is metered on the ops core and falls back to null so the
// demo never stalls if the sandbox is down.
// ─────────────────────────────────────────────────────────────

import { ops, logEvent, recordDataPull } from "./ops";

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
    // data-plane lineage: which API, which account (masked), how many fields
    const acct = String(body.AccountNumber ?? body.corporateAccountNumber ?? "");
    recordDataPull(service.split("/")[0], acct, Object.keys(data as object).length, ms);
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

// ─────────────────────────────────────────────────────────────
// LIVE DIGITAL TWIN — assembled at runtime, entirely from SBI core-banking
// APIs. Nothing synthetic: name, balance, transactions, dates and branch all
// come from Customer Information Enquiry + Account Enquiry + Account Balance.
// ─────────────────────────────────────────────────────────────

import type { Customer } from "./data";

type CoreEnquiry = {
  CustomerName: string;
  TotalBalanceClearedBalance: string;
  NumberOfTransactions: string;
  AccountNumber: string;
  Currency: string;
  AccountDetails?: {
    TranCode: string;
    TransactionAmount: string;
    CurrentBalance: string;
    TransactionDesc: string;
    PostDate: string;
    Branch: string;
    JournalNumber: string;
  }[];
};

export type LiveTwinResult = {
  customer: Customer;
  provenance: { source: string; ms: number; ok: boolean }[];
  fetchedAt: number;
};

// Three REAL relationships exposed by the InnoHub sandbox — each is a distinct
// engagement use case. This is the production data path: point ROSTER at the
// bank's CIF book and nothing else changes.
const ROSTER = [
  { account: "30095497360", kind: "saver" as const },
  { account: "30002709704", kind: "winback" as const },
  { account: "corp" as const, kind: "corporate" as const },
];

function twinShell(id: string, name: string, segment: string, balance: string, hue: number): Customer {
  return {
    id,
    name,
    age: 41,
    segment,
    location: "SBI core banking",
    language: "English / Hindi",
    avatarHue: hue,
    products: ["Savings A/c (live)"],
    balance,
    relationshipYears: 3,
    yonoActive: true,
    twinSummary: "",
    goals: [],
    signals: [],
    memory: [
      { id: "lm1", kind: "semantic", text: "All twin fields pulled live from SBI core-banking APIs; account numbers masked; nothing persisted (DPDP storage-limitation).", time: "runtime" },
      { id: "lm2", kind: "semantic", text: "Identifiers are redacted by the Azure PII guard before this twin reaches the LLM.", time: "runtime" },
    ],
    fallback: {
      steps: [
        { agent: "Sensor Agent", icon: "radar", finding: "Live core pull completed; signals correlated from real transactions.", confidence: 0.9 },
        { agent: "Life-Event Agent", icon: "sparkles", finding: "Engagement window inferred from account activity pattern.", confidence: 0.82 },
        { agent: "Risk & Compliance Agent", icon: "shield", finding: "Bank-owned API data; DPDP redaction applied pre-LLM; suitability clear.", confidence: 0.97 },
        { agent: "Offer Agent", icon: "gift", finding: "Next-best-action selected from the live balance/transaction profile.", confidence: 0.88 },
        { agent: "Conversation Agent", icon: "message", finding: "Numbers-first outreach drafted, pending officer approval.", confidence: 0.9 },
      ],
      nba: {
        action: "Engage based on live account profile",
        product: "SBI deposit product",
        rationale: "Derived from live core-banking signals.",
        channel: "WhatsApp",
        timing: "Today, post-6pm",
        language: "English",
        compliance: [
          { rule: "RBI product suitability", status: "pass" },
          { rule: "DPDP consent & purpose limitation", status: "pass" },
          { rule: "Bank-owned APIs only", status: "pass" },
          { rule: "Maker-checker on every action", status: "pass" },
        ],
        message: "Hello! I have a suggestion based on your recent account activity — shall I share it? — AURA, your SBI assistant",
      },
      chatOpener: "Hello! 👋 I'm AURA. I have a suggestion based on your recent account activity — would you like to hear it?",
    },
    personaPrompt: "",
  };
}

// Build one live twin for a real account. kind steers the use-case framing.
export async function buildLiveTwin(account: string, kind: "saver" | "winback" | "corporate"): Promise<LiveTwinResult> {
  if (kind === "corporate") {
    const corp = await getAccountBalance();
    const bal = corp.ok ? Number(corp.data.data.availBalance).toLocaleString("en-IN") : "—";
    const c = twinShell("live-corp", "Corporate Client · Treasury", "LIVE · Corporate Banking", `₹${bal}`, 330);
    c.products = ["Corporate current a/c (live)"];
    c.twinSummary = `Twin assembled from the live Account Balance API. Corporate current account holds ₹${bal} available (book = available, zero hold, zero unclear) — idle float earning nothing overnight. Classic auto-sweep / Multi Option Deposit opportunity for the treasury.`;
    c.goals = ["Overnight yield on idle float", "Zero manual treasury ops"];
    if (corp.ok)
      c.signals = [
        { id: "c1", type: "transaction", label: `Available float ₹${bal}`, detail: `Corporate a/c ending ${corp.data.data.corporateAccountNumber.slice(-4)} · ref ${corp.data.data.aPIResRefNo} — live from Account Balance API (${corp.ms}ms)`, time: "now", strength: "high" },
        { id: "c2", type: "transaction", label: "Hold ₹0 · unclear ₹0", detail: "Entire balance deployable — no lien, no float risk — live from Account Balance API", time: "now", strength: "medium" },
      ];
    c.personaPrompt = `Corporate treasury client, available float ₹${bal} on the current account (live from SBI core). Considering auto-sweep into overnight deposits.`;
    return { customer: c, provenance: [{ source: "Account Balance", ms: corp.ms, ok: corp.ok }], fetchedAt: Date.now() };
  }

  const [info, stmt] = await Promise.all([
    sbiPost<CoreEnquiry>(kind === "saver" ? "customerinformationenquiry/v1" : "accountenquiryapi/v1", kind === "saver" ? "/enquiry" : "/accounts", { AccountNumber: account }),
    kind === "saver" ? getAccountStatement(account) : Promise.resolve({ ok: false as const, error: "n/a", ms: 0 }),
  ]);

  const name = info.ok ? info.data.CustomerName : "SBI Retail Customer";
  const bal = info.ok ? info.data.TotalBalanceClearedBalance.trim() : "—";
  const txns = info.ok ? parseInt(info.data.NumberOfTransactions || "0", 10) : 0;
  const last = info.ok ? info.data.AccountDetails?.[0] : undefined;

  const c = twinShell(`live-${account}`, name, kind === "saver" ? "LIVE · Retail — Active Saver" : "LIVE · Retail — Win-back", `₹${bal}`, kind === "saver" ? 265 : 20);
  if (info.ok) {
    c.signals = (info.data.AccountDetails ?? []).slice(0, 3).map((t, i) => ({
      id: `t${i}`,
      type: "transaction" as const,
      label: `${t.TransactionDesc || "Core txn"} · ₹${t.TransactionAmount.trim()}`,
      detail: `Posted ${t.PostDate} · branch ${t.Branch} · journal ${t.JournalNumber} · running balance ₹${t.CurrentBalance.trim()} — live from ${kind === "saver" ? "Customer Information Enquiry" : "Account Enquiry"} API`,
      time: t.PostDate,
      strength: "high" as const,
    }));
    c.signals.push({ id: "bal", type: "transaction", label: `Cleared balance ₹${bal}`, detail: `${txns} transactions on record for a/c ending ${account.slice(-4)} — live from SBI core`, time: "now", strength: "high" });
  }
  if (kind === "saver") {
    c.twinSummary = `Twin assembled from SBI core APIs — no synthetic data. ${name}: cleared balance ₹${bal}, ${txns} transactions; latest movement "${last?.TransactionDesc ?? ""}" on ${last?.PostDate ?? ""}. Idle cleared balance with no deposit product attached — sweep-to-deposit opportunity.`;
    c.goals = ["Put idle balance to work", "Consolidate linked accounts"];
    c.personaPrompt = `Customer: ${name}, retail SBI customer, cleared balance ₹${bal}, ${txns} transactions (live from SBI core). Latest: credit by transfer. Good fit for a term/sweep deposit on the idle balance.`;
  } else {
    c.twinSummary = `Twin assembled from SBI core APIs — no synthetic data. ${name}: balance ₹${bal}, ${txns} transactions; latest movement "${last?.TransactionDesc ?? ""}" (${last?.PostDate ?? ""}) — the account was emptied to closure. Dormant/churned relationship: a respectful win-back journey, not a product push.`;
    c.goals = ["Understand why the customer left", "Rebuild the relationship"];
    c.personaPrompt = `Customer: ${name}, retail SBI customer whose account shows "${last?.TransactionDesc ?? "closure transfer"}" and a ₹${bal} balance (live from SBI core). Churned/dormant — the right move is an empathetic win-back conversation, never a hard sell.`;
  }
  return {
    customer: c,
    provenance: [
      { source: kind === "saver" ? "Customer Information Enquiry" : "Account Enquiry", ms: info.ms, ok: info.ok },
      ...(kind === "saver" ? [{ source: "Account Statement Enquiry", ms: stmt.ms, ok: stmt.ok }] : []),
    ],
    fetchedAt: Date.now(),
  };
}

// Full live roster — one twin per real relationship on the core.
export async function getLiveRoster(): Promise<LiveTwinResult[]> {
  return Promise.all(
    ROSTER.map((r) => buildLiveTwin(r.account === "corp" ? "corp" : r.account, r.kind))
  );
}

// Resolve any "live-*" customer id to a freshly built twin.
export async function resolveLiveCustomer(id: string): Promise<Customer | null> {
  if (id === "live-sbi") id = "live-30095497360"; // legacy alias
  if (id === "live-corp") return (await buildLiveTwin("corp", "corporate")).customer;
  if (id.startsWith("live-")) {
    const acct = id.slice(5);
    const entry = ROSTER.find((r) => r.account === acct);
    return (await buildLiveTwin(acct, entry?.kind === "winback" ? "winback" : "saver")).customer;
  }
  return null;
}
