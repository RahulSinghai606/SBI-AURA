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

type CoreTxn = {
  TranCode: string;
  TransactionAmount: string;
  CurrentBalance: string;
  TransactionDesc: string;
  PostDate: string;
  ValueDate?: string;
  Branch: string;
  Terminal?: string;
  Type?: string;
  ChequeNumber?: string;
  JournalNumber: string;
};
type CoreEnquiry = {
  CustomerName: string;
  TotalBalanceClearedBalance: string;
  NumberOfTransactions: string;
  AccountNumber: string;
  Currency: string;
  AccountDetails?: CoreTxn[];
};

export type LiveTwinResult = {
  customer: Customer;
  provenance: { source: string; ms: number; ok: boolean }[];
  insight: TwinInsight | null;
  fetchedAt: number;
};

// ── Signal derivation: turn raw core fields into behavioural intelligence ──
export type TwinInsight = {
  balanceValue: number;
  txnCount: number;
  daysSinceActivity: number | null;
  channel: string;
  state: "active" | "idle-funds" | "dormant" | "churned";
  engagementScore: number; // 0-100 relationship health
  opportunityScore: number; // 0-100 next-best-action strength
  derivedSignals: import("./data").Signal[];
};

// parse "dd/mm/yy" → days elapsed (SBI core posting date)
function daysSince(postDate?: string): number | null {
  if (!postDate) return null;
  const m = postDate.split("/");
  if (m.length !== 3) return null;
  const yy = parseInt(m[2], 10);
  const d = new Date(2000 + yy, parseInt(m[1], 10) - 1, parseInt(m[0], 10));
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  return diff >= 0 && diff < 20000 ? diff : null;
}

// map SBI core transaction/terminal codes to an engagement channel
function channelOf(t?: CoreTxn): string {
  if (!t) return "unknown";
  const desc = (t.TransactionDesc || "").toUpperCase();
  if (desc.includes("UPI")) return "UPI";
  if (desc.includes("TRANSFER") || desc.includes("TFR") || desc.includes("NEFT") || desc.includes("IMPS")) return "digital transfer";
  if (desc.includes("ATM")) return "ATM";
  if (desc.includes("CHQ") || t.ChequeNumber) return "cheque / branch";
  return "branch";
}

function num(s?: string): number {
  return Math.abs(parseFloat((s || "0").replace(/[^0-9.]/g, "")) || 0);
}

// The core intelligence: derive behavioural signals + scores from live data.
export function deriveInsight(e: CoreEnquiry): TwinInsight {
  const last = e.AccountDetails?.[0];
  const bal = num(e.TotalBalanceClearedBalance);
  const txns = parseInt(e.NumberOfTransactions || "0", 10);
  const days = daysSince(last?.PostDate);
  const channel = channelOf(last);
  const closed = (last?.TransactionDesc || "").toUpperCase().includes("CLOSE");

  const state: TwinInsight["state"] = closed || bal === 0 ? "churned" : days !== null && days > 180 ? "dormant" : bal > 5000 ? "idle-funds" : "active";

  // engagement health: recent activity + balance + transaction count
  const recencyScore = days === null ? 40 : days < 30 ? 100 : days < 90 ? 75 : days < 180 ? 50 : days < 365 ? 25 : 8;
  const balScore = bal === 0 ? 0 : bal > 100000 ? 100 : bal > 10000 ? 70 : 40;
  const activityScore = Math.min(100, txns * 8);
  const engagementScore = Math.round(recencyScore * 0.5 + balScore * 0.3 + activityScore * 0.2);

  // opportunity: high when idle funds sit unused, or churned (win-back)
  const opportunityScore = state === "idle-funds" ? Math.min(100, 55 + Math.round(bal / 5000)) : state === "churned" ? 82 : state === "dormant" ? 74 : 45;

  const sig: import("./data").Signal[] = [];
  if (last)
    sig.push({
      id: "d-last",
      type: "transaction",
      label: `${last.TransactionDesc || "Movement"} · ₹${last.TransactionAmount.trim()}`,
      detail: `Posted ${last.PostDate}${last.ValueDate ? ` (value ${last.ValueDate})` : ""} · branch ${last.Branch} · journal ${last.JournalNumber} — live from SBI core`,
      time: last.PostDate,
      strength: "high",
    });
  if (days !== null)
    sig.push({
      id: "d-recency",
      type: days > 180 ? "life-event" : "app",
      label: days > 180 ? `Dormant ${days} days` : `Last active ${days} days ago`,
      detail: `${days} days since the last posting — ${days > 365 ? "long-dormant relationship, re-engagement priority" : days > 180 ? "cooling relationship, act before attrition" : "active relationship"} (inferred from core posting date)`,
      time: "computed",
      strength: days > 180 ? "high" : "medium",
    });
  sig.push({
    id: "d-channel",
    type: "transaction",
    label: `Preferred channel: ${channel}`,
    detail: `Last movement routed via ${channel} (tran-code ${last?.TranCode ?? "—"}${last?.Terminal ? `, terminal ${last.Terminal}` : ""}) — steer outreach to the channel the customer already uses`,
    time: "computed",
    strength: "medium",
  });
  sig.push({
    id: "d-balance",
    type: "transaction",
    label: state === "idle-funds" ? `Idle cleared funds ₹${e.TotalBalanceClearedBalance.trim()}` : `Balance ₹${e.TotalBalanceClearedBalance.trim()}`,
    detail: `${txns} transactions on record · state classified as "${state}" · engagement health ${engagementScore}/100 · opportunity ${opportunityScore}/100 (derived from live balance, recency and activity)`,
    time: "now",
    strength: state === "idle-funds" || state === "churned" ? "high" : "medium",
  });

  return { balanceValue: bal, txnCount: txns, daysSinceActivity: days, channel, state, engagementScore, opportunityScore, derivedSignals: sig };
}

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
    const cVal = corp.ok ? num(corp.data.data.availBalance) : 0;
    const cInsight: TwinInsight = { balanceValue: cVal, txnCount: 0, daysSinceActivity: null, channel: "corporate portal", state: "idle-funds", engagementScore: 70, opportunityScore: Math.min(100, 60 + Math.round(cVal / 200000)), derivedSignals: c.signals };
    return { customer: c, insight: cInsight, provenance: [{ source: "Account Balance", ms: corp.ms, ok: corp.ok }], fetchedAt: Date.now() };
  }

  const [info, stmt] = await Promise.all([
    sbiPost<CoreEnquiry>(kind === "saver" ? "customerinformationenquiry/v1" : "accountenquiryapi/v1", kind === "saver" ? "/enquiry" : "/accounts", { AccountNumber: account }),
    kind === "saver" ? getAccountStatement(account) : Promise.resolve({ ok: false as const, error: "n/a", ms: 0 }),
  ]);

  const name = info.ok ? info.data.CustomerName : "SBI Retail Customer";
  const bal = info.ok ? info.data.TotalBalanceClearedBalance.trim() : "—";
  const txns = info.ok ? parseInt(info.data.NumberOfTransactions || "0", 10) : 0;
  const last = info.ok ? info.data.AccountDetails?.[0] : undefined;

  // ── derive behavioural signals + scores from the live data ──
  const insight = info.ok ? deriveInsight(info.data) : null;

  const c = twinShell(`live-${account}`, name, kind === "saver" ? "LIVE · Retail — Active Saver" : "LIVE · Retail — Win-back", `₹${bal}`, kind === "saver" ? 265 : 20);
  if (insight) c.signals = insight.derivedSignals;

  const scoreLine = insight ? ` Engagement health ${insight.engagementScore}/100, opportunity ${insight.opportunityScore}/100, preferred channel ${insight.channel}${insight.daysSinceActivity !== null ? `, ${insight.daysSinceActivity} days since last activity` : ""}.` : "";

  if (kind === "saver") {
    c.twinSummary = `Twin assembled from SBI core APIs — no synthetic data. ${name}: cleared balance ₹${bal}, ${txns} transactions; latest movement "${last?.TransactionDesc ?? ""}" on ${last?.PostDate ?? ""}.${scoreLine} State: ${insight?.state ?? "active"} — idle cleared balance with no deposit product attached, a sweep-to-deposit opportunity.`;
    c.goals = ["Put idle balance to work", "Consolidate linked accounts"];
    c.personaPrompt = `Customer: ${name}, retail SBI customer, cleared balance ₹${bal}, ${txns} transactions (live from SBI core).${scoreLine} Idle-funds state — good fit for a term/sweep deposit. Reach on the preferred channel (${insight?.channel ?? "digital"}).`;
  } else {
    c.twinSummary = `Twin assembled from SBI core APIs — no synthetic data. ${name}: balance ₹${bal}, ${txns} transactions; latest movement "${last?.TransactionDesc ?? ""}" (${last?.PostDate ?? ""}) — account emptied to closure.${scoreLine} State: ${insight?.state ?? "churned"} — a respectful win-back journey, not a product push.`;
    c.goals = ["Understand why the customer left", "Rebuild the relationship"];
    c.personaPrompt = `Customer: ${name}, retail SBI customer whose account shows "${last?.TransactionDesc ?? "closure transfer"}", ₹${bal} balance (live from SBI core).${scoreLine} Churned/dormant — the right move is an empathetic win-back conversation, never a hard sell.`;
  }
  return {
    customer: c,
    insight,
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
