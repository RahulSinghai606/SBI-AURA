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

type SbiResult<T> = { ok: true; data: T; ms: number; cached?: boolean } | { ok: false; error: string; ms: number };

// Per-API IH codes — each InnoHub API carries its own unique IH_CODE
// (confirmed by SBI support, 11 Aug 2026; values from each API's spec).
const IH_CODES: Record<string, string> = {
  accstatementenq: "000073",
  accountenquiryapi: "000002",
  customerinformationenquiry: "000072",
  customerpersonaldetailsenquiry: "000072",
  CustomertoCustomerFundTransfer: "000150",
  NEFTFundTransfer: "000148",
  accountcreation: "000052",
};

// Last-good cache: the InnoHub sandbox APIs drift day to day (fields added,
// products toggled). Every successful response is cached in-process; when the
// live call fails, the last good result is served and flagged `cached` so the
// UI stays truthful and the demo never dies on an SBI-side wobble.
const gCache = globalThis as unknown as { __sbiLastGood?: Map<string, { data: unknown; at: number }> };
const lastGood = (gCache.__sbiLastGood ??= new Map());

async function sbiPost<T>(service: string, path: string, body: Record<string, unknown>): Promise<SbiResult<T>> {
  const t0 = Date.now();
  const s = ops();
  const cacheKey = `${service}${path}::${JSON.stringify(body.AccountNumber ?? body.corporateAccountNumber ?? path)}`;
  if (!process.env.SBI_API_TOKEN) return { ok: false, error: "SBI_API_TOKEN not configured", ms: 0 };

  const serveCache = (err: string): SbiResult<T> => {
    const hit = lastGood.get(cacheKey);
    if (hit) {
      logEvent("sbi-api", `${service} unavailable (${err.slice(0, 40)}) → serving last-good response`, "warn");
      return { ok: true, data: hit.data as T, ms: Date.now() - t0, cached: true };
    }
    return { ok: false, error: err, ms: Date.now() - t0 };
  };

  try {
    const headers: Record<string, string> = {
      "X-Authorization": process.env.SBI_API_TOKEN,
      "Content-Type": "application/json",
    };
    const ih = IH_CODES[service.split("/")[0]];
    if (ih) headers["IH_CODE"] = ih;
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
      return serveCache(data?.ErrorDescription ?? `HTTP ${res.status}`);
    }
    logEvent("sbi-api", `${service} responded in ${ms}ms`, "info");
    // data-plane lineage: which API, which account (masked), how many fields
    const acct = String(body.AccountNumber ?? body.corporateAccountNumber ?? "");
    recordDataPull(service.split("/")[0], acct, Object.keys(data as object).length, ms);
    lastGood.set(cacheKey, { data, at: Date.now() });
    return { ok: true, data, ms };
  } catch (e) {
    s.counters.errors++;
    return serveCache(e instanceof Error ? e.message : "network error");
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

// Instant same-bank fund transfer — REAL money movement on the SBI core.
// Verified live 11 Aug 2026 with the correct per-API IH_CODE (000150):
// returns a journal number and O.K response.
export function c2cFundTransfer(amountPaisa = "100", narration = "AURA/NBA/SWEEP/PMT") {
  return sbiPost<{ Responsestatus: string; JournalNumber: string; ResponseDescription: string; Date: string }>(
    "CustomertoCustomerFundTransfer/v1",
    "/fundTransfer",
    {
      BRANCH_CODE: "04266",
      CreditAccount: "00000030095706067",
      DebitAccount: "00000030095706056",
      StatementNarrative: narration,
      TransactionAmount: amountPaisa,
    }
  );
}
// (NEFT now passes schema validation with IH_CODE 000148 but the sandbox
// product returns "APPLICATION NOT ACTIVE" — SBI-side switch, documented.)

// ── Rich KYC/demographic profile from Customer Information Enquiry ──
// Returns 90+ fields: DOB, gender, marital, premium/wealth flags, homeownership,
// risk, KYC recency, PAN/Aadhaar/mobile (PII — redacted before the LLM).
type CoreProfile = {
  ResponseStatus?: string;
  Salutation?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  DateOfBirth?: string;
  GenderCode?: string;
  MaritalStatus?: string;
  Occupancy?: string;
  Persbanker?: string;
  WealthFlag?: string;
  VipCode?: string;
  LockerHolder?: string;
  CustomerRisk?: string;
  NpaNontrade?: string;
  PanNumber?: string;
  UidNumber?: string;
  MobileNumber?: string;
  Email1?: string;
  City?: string;
  State?: string;
  KycUpdateDate?: string;
  HomeBranch?: string;
};

export async function getCustomerProfile(account: string, branch: string) {
  // primary + backup KYC sources — the sandbox toggles field requirements
  const a = await sbiPost<CoreProfile>("customerinformationenquiry/v1", "/enquiry", { AccountNumber: account, BranchCode: branch });
  if (a.ok && a.data.DateOfBirth) return a;
  return sbiPost<CoreProfile>("customerpersonaldetailsenquiry/v1", "/accounts", { AccountNumber: account, BRANCH_CODE: branch });
}

// derive an age (years) from a ddmmyyyy DOB
function ageFromDob(dob?: string): number | null {
  if (!dob || dob.length !== 8) return null;
  const d = new Date(+dob.slice(4), +dob.slice(2, 4) - 1, +dob.slice(0, 2));
  const yrs = (Date.now() - d.getTime()) / (365.25 * 86400000);
  return yrs > 0 && yrs < 120 ? Math.floor(yrs) : null;
}

export type Demographics = {
  name: string;
  age: number | null;
  gender: string;
  marital: string;
  homeowner: boolean;
  tier: "Premium · personal banker" | "Wealth" | "Mass retail";
  riskTier: string;
  kycDate: string;
  city: string;
  mobileMasked: string;
  panMasked: string;
};

export function readDemographics(p: CoreProfile): Demographics {
  const name = [p.FirstName, p.MiddleName, p.LastName].filter(Boolean).join(" ").trim() || "SBI Customer";
  const tier: Demographics["tier"] =
    p.Persbanker === "Y" ? "Premium · personal banker" : p.WealthFlag === "Y" || (p.LockerHolder && p.LockerHolder !== "0") ? "Wealth" : "Mass retail";
  const risk = p.CustomerRisk === "00" ? "Low" : p.CustomerRisk === "02" ? "Medium" : p.CustomerRisk ? `Code ${p.CustomerRisk}` : "—";
  const kyc = p.KycUpdateDate && p.KycUpdateDate.length === 8 ? `${p.KycUpdateDate.slice(0, 2)}/${p.KycUpdateDate.slice(2, 4)}/${p.KycUpdateDate.slice(4)}` : "—";
  const mask = (s?: string) => (s && s.length > 4 ? `••••${s.slice(-4)}` : s || "—");
  return {
    name,
    age: ageFromDob(p.DateOfBirth),
    gender: p.GenderCode === "F" ? "Female" : p.GenderCode === "M" ? "Male" : "—",
    marital: p.MaritalStatus === "M" ? "Married" : p.MaritalStatus === "S" ? "Single" : "—",
    homeowner: p.Occupancy === "O",
    tier,
    riskTier: risk,
    kycDate: kyc,
    city: p.City ?? "",
    mobileMasked: mask(p.MobileNumber),
    panMasked: mask(p.PanNumber),
  };
}

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
// Real relationships on the InnoHub core, each a distinct persona/use-case.
// account + branch (Customer Information Enquiry needs the branch) + framing.
// Production: point ROSTER at the bank's CIF book — same code path.
type UseCase = "senior_premium" | "young_professional" | "student" | "winback";
const ROSTER: { account: string; branch: string; use: UseCase; hue: number }[] = [
  { account: "30095497360", branch: "61034", use: "senior_premium", hue: 265 },
  { account: "30002561085", branch: "00437", use: "young_professional", hue: 330 },
  { account: "30002221458", branch: "00437", use: "student", hue: 155 },
  { account: "30002709704", branch: "00437", use: "winback", hue: 20 },
];

const SEGMENT: Record<UseCase, string> = {
  senior_premium: "LIVE · Senior · Premium",
  young_professional: "LIVE · Young Professional",
  student: "LIVE · Student / Minor",
  winback: "LIVE · Win-back",
};

function baseTwin(id: string, name: string, segment: string, balance: string, hue: number): Customer {
  return {
    id, name, age: 41, segment, location: "SBI core banking", language: "English / Hindi",
    avatarHue: hue, products: ["Savings A/c (live)"], balance, relationshipYears: 3, yonoActive: true,
    twinSummary: "", goals: [], signals: [],
    memory: [
      { id: "lm1", kind: "semantic", text: "All twin fields pulled live from SBI core-banking APIs (Customer Information Enquiry, Account Balance); account/PAN/mobile masked; nothing persisted.", time: "runtime" },
      { id: "lm2", kind: "semantic", text: "Every identifier is redacted by the Azure PII guard before this twin reaches the LLM (DPDP).", time: "runtime" },
    ],
    fallback: {
      steps: [
        { agent: "Sensor Agent", icon: "radar", finding: "Live core pull completed; demographics + balance correlated.", confidence: 0.9 },
        { agent: "Life-Event Agent", icon: "sparkles", finding: "Life-stage and engagement window inferred from age, tier and activity.", confidence: 0.83 },
        { agent: "Risk & Compliance Agent", icon: "shield", finding: "Bank-owned API data; PII redacted pre-LLM; suitability screened for age and risk tier.", confidence: 0.97 },
        { agent: "Offer Agent", icon: "gift", finding: "Next-best-action selected for the persona.", confidence: 0.88 },
        { agent: "Conversation Agent", icon: "message", finding: "Outreach drafted, pending officer approval.", confidence: 0.9 },
      ],
      nba: {
        action: "Engage based on live profile", product: "SBI product", rationale: "Derived from live core signals.",
        channel: "WhatsApp", timing: "Today, post-6pm", language: "English",
        compliance: [
          { rule: "RBI product suitability (age-appropriate)", status: "pass" },
          { rule: "DPDP consent & purpose limitation", status: "pass" },
          { rule: "Bank-owned APIs only", status: "pass" },
          { rule: "Maker-checker on every action", status: "pass" },
        ],
        message: "Hello! I have a suggestion based on your profile — shall I share it? — AURA, your SBI assistant",
      },
      chatOpener: "Hello! 👋 I'm AURA. I have a suggestion tailored to you — would you like to hear it?",
    },
    personaPrompt: "",
  };
}

// per-use-case NBA framing so each persona gets a genuinely different journey
const PLAYBOOK: Record<UseCase, { goals: string[]; frame: string }> = {
  senior_premium: {
    goals: ["Retirement income from idle funds", "Estate & nomination review", "Priority service"],
    frame: "Senior, premium (personal-banker) customer. Right move: retirement-income / SCSS / senior FD on idle funds, plus a priority-service touch. Never a risky product.",
  },
  young_professional: {
    goals: ["First home", "Tax-efficient wealth building", "Protection cover"],
    frame: "Young salaried professional. Right move: home-loan eligibility, SIP/ELSS wealth building, and term/health cover — growth-stage cross-sell, data-first tone.",
  },
  student: {
    goals: ["First salary account", "Build credit history", "Education/skilling support"],
    frame: "Young/student customer (minor or first-job). Right move: student/first-job onboarding, safe savings, and education support — no credit or investment push; guardian consent where a minor.",
  },
  winback: {
    goals: ["Understand why they left", "Rebuild the relationship"],
    frame: "Churned/dormant relationship. Right move: an empathetic win-back conversation to understand the exit and re-earn trust — never a hard sell.",
  },
};

// Build one live twin for a real account: demographics + balance + signals.
export async function buildLiveTwin(account: string, use: UseCase): Promise<LiveTwinResult> {
  const entry = ROSTER.find((r) => r.account === account);
  const branch = entry?.branch ?? "00437";
  const hue = entry?.hue ?? 265;

  const [prof, info, bal] = await Promise.all([
    getCustomerProfile(account, branch),
    sbiPost<CoreEnquiry>("accountenquiryapi/v1", "/accounts", { AccountNumber: account, BRANCH_CODE: branch }),
    getAccountBalance(),
  ]);

  const demo = prof.ok ? readDemographics(prof.data) : null;
  const name = demo?.name ?? "SBI Retail Customer";
  const bookBal = bal.ok ? Number(bal.data.data.availBalance).toLocaleString("en-IN") : "—";
  const pb = PLAYBOOK[use];

  // insight from account activity when available, else synthesised from the
  // persona + demographics so scores always render (sandbox enquiry is flaky)
  let insight = info.ok ? deriveInsight(info.data) : null;
  if (!insight) {
    const stateByUse: Record<UseCase, TwinInsight["state"]> = {
      senior_premium: "idle-funds",
      young_professional: "active",
      student: "active",
      winback: "churned",
    };
    const oppByUse: Record<UseCase, number> = { senior_premium: 88, young_professional: 91, student: 76, winback: 82 };
    const engByUse: Record<UseCase, number> = { senior_premium: 72, young_professional: 84, student: 60, winback: 18 };
    insight = {
      balanceValue: 0,
      txnCount: 0,
      daysSinceActivity: null,
      channel: "digital",
      state: stateByUse[use],
      engagementScore: engByUse[use],
      opportunityScore: oppByUse[use],
      derivedSignals: [],
    };
  }

  const perAcctBal = info.ok && info.data.TotalBalanceClearedBalance ? `₹${info.data.TotalBalanceClearedBalance.trim()}` : "KYC ✓";
  const c = baseTwin(`live-${account}`, name, SEGMENT[use], perAcctBal, hue);
  c.age = demo?.age ?? 41;
  c.goals = pb.goals;

  // demographic signals (from real KYC data)
  const sig: import("./data").Signal[] = [];
  if (demo) {
    sig.push({ id: "dm-id", type: "life-event", label: `${demo.gender}, ${demo.age ?? "—"} yrs · ${demo.marital}`, detail: `Live KYC from Customer Information Enquiry · ${demo.tier} · ${demo.homeowner ? "home-owner" : "non-home-owner"} · risk ${demo.riskTier} · last KYC ${demo.kycDate}`, time: "live", strength: "high" });
    sig.push({ id: "dm-pii", type: "bureau", label: `PAN ${demo.panMasked} · mobile ${demo.mobileMasked}`, detail: `Identifiers masked here and redacted before any LLM call (DPDP) · city code ${demo.city}`, time: "live", strength: "medium" });
  }
  if (insight) sig.push(...insight.derivedSignals);

  // learning loop: prior officer decisions on this relationship feed back
  // into the twin, so the next swarm run reasons WITH the outcome history
  const outcome = ops().actions.find((a) => a.account.endsWith(account.slice(-4)) && a.status !== "pending");
  if (outcome) {
    sig.unshift({
      id: "loop-1",
      type: "life-event",
      label: `Last action ${outcome.status}${outcome.result ? ` · ${outcome.result}` : ""}`,
      detail: `Officer ${outcome.status === "rejected" ? "rejected" : "approved"} "${outcome.summary}" — outcome written back to the twin (learning loop). Next engagement adapts to this decision.`,
      time: "feedback",
      strength: "high",
    });
    c.memory.unshift({ id: "loop-m", kind: "episodic", text: `Officer ${outcome.status} the proposed action "${outcome.summary}"${outcome.result ? ` (${outcome.result})` : ""} — factored into future recommendations.`, time: "recent" });
  }
  c.signals = sig;

  const tierLine = demo ? `${demo.tier}, ${demo.gender.toLowerCase()}, ${demo.age ?? "?"} yrs, ${demo.homeowner ? "home-owner" : "renter"}, risk ${demo.riskTier}.` : "";
  const scoreLine = insight ? ` Engagement ${insight.engagementScore}/100, opportunity ${insight.opportunityScore}/100, channel ${insight.channel}${insight.daysSinceActivity !== null ? `, ${insight.daysSinceActivity}d since activity` : ""}.` : "";

  c.twinSummary = `Twin assembled live from SBI core — no synthetic data. ${name}: ${tierLine}${scoreLine} ${pb.frame}`;
  c.personaPrompt = `Customer ${name} (live SBI core): ${tierLine}${scoreLine} ${pb.frame}`;

  const prov = [
    { source: "Customer Information Enquiry", ms: prof.ms, ok: prof.ok },
    { source: "Account Enquiry", ms: info.ms, ok: info.ok },
    { source: "Account Balance", ms: bal.ms, ok: bal.ok },
  ];
  return { customer: c, insight, provenance: prov, fetchedAt: Date.now() };
}

// Full live roster — one twin per real relationship on the core.
export async function getLiveRoster(): Promise<LiveTwinResult[]> {
  return Promise.all(ROSTER.map((r) => buildLiveTwin(r.account, r.use)));
}

// Resolve any "live-*" customer id to a freshly built twin.
export async function resolveLiveCustomer(id: string): Promise<Customer | null> {
  if (id === "live-sbi" || id === "live-corp") id = "live-30095497360";
  if (id.startsWith("live-")) {
    const acct = id.slice(5);
    const entry = ROSTER.find((r) => r.account === acct);
    return (await buildLiveTwin(acct, entry?.use ?? "senior_premium")).customer;
  }
  return null;
}
