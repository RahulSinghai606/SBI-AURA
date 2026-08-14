// ─────────────────────────────────────────────────────────────
// SBI InnoHub API — schema-faithful MOCK layer.
//
// Per SBI Talent/Innohub guidance (Aug 2026): "mock the API responses using the
// provided API schema wherever possible, to prevent delays in development."
// The InnoHub sandbox endpoints are still being enabled across cross-functional
// teams, so AURA ships a deterministic mock that mirrors each API's real
// response schema exactly. The application code path is identical to live —
// only the transport is swapped — so pointing back at the live sandbox is a
// one-line switch (SBI_MODE=live) with zero code change.
//
// Every mock response is flagged `mock: true` so the UI and audit trail stay
// truthful about provenance. Nothing here fabricates a "live" claim.
// ─────────────────────────────────────────────────────────────

// dd/mm/yy for a date N days ago (matches SBI core PostDate format)
function ago(days: number): string {
  const d = new Date(Date.now() - days * 86400000);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

type CoreTxn = {
  TranCode: string; TransactionAmount: string; CurrentBalance: string; TransactionDesc: string;
  PostDate: string; ValueDate?: string; Branch: string; Terminal?: string; Type?: string; JournalNumber: string;
};

// Persona-accurate account activity per real InnoHub account. Each set drives a
// genuinely different Digital-Twin state (idle-funds / active / active / churned)
// through the same deriveInsight() engine used for live data.
const ENQUIRY: Record<string, { name: string; balance: string; txns: string; details: CoreTxn[] }> = {
  // Senior · premium — high idle balance, sparse activity → "idle-funds"
  "30095497360": {
    name: "SHRIPAD RAMESH DHALWALKAR", balance: "842156.00", txns: "3",
    details: [
      { TranCode: "060", TransactionAmount: "48200.00", CurrentBalance: "842156.00", TransactionDesc: "PENSION CREDIT DEFENCE", PostDate: ago(26), ValueDate: ago(26), Branch: "61034", Type: "C", JournalNumber: "0587741" },
      { TranCode: "062", TransactionAmount: "1500.00", CurrentBalance: "793956.00", TransactionDesc: "ATM CASH WDL", PostDate: ago(58), ValueDate: ago(58), Branch: "61034", Terminal: "S1AB4021", Type: "D", JournalNumber: "0571120" },
      { TranCode: "060", TransactionAmount: "48200.00", CurrentBalance: "795456.00", TransactionDesc: "PENSION CREDIT DEFENCE", PostDate: ago(57), ValueDate: ago(57), Branch: "61034", Type: "C", JournalNumber: "0569004" },
    ],
  },
  // Young professional — salary + UPI + SIP → "active"
  "30002561085": {
    name: "SAGAR JAIN", balance: "56780.00", txns: "14",
    details: [
      { TranCode: "091", TransactionAmount: "320.00", CurrentBalance: "56780.00", TransactionDesc: "UPI/ZOMATO/PAYMENT", PostDate: ago(1), ValueDate: ago(1), Branch: "00437", Terminal: "UPI", Type: "D", JournalNumber: "0611203" },
      { TranCode: "091", TransactionAmount: "5000.00", CurrentBalance: "57100.00", TransactionDesc: "SIP DEBIT SBI MF ELSS", PostDate: ago(4), ValueDate: ago(4), Branch: "00437", Type: "D", JournalNumber: "0610877" },
      { TranCode: "060", TransactionAmount: "92000.00", CurrentBalance: "62100.00", TransactionDesc: "NEFT SALARY CREDIT", PostDate: ago(5), ValueDate: ago(5), Branch: "00437", Terminal: "NEFT", Type: "C", JournalNumber: "0610540" },
    ],
  },
  // Student / minor — small UPI + scholarship → "active"
  "30002221458": {
    name: "RAHUL DRAVID", balance: "8450.00", txns: "7",
    details: [
      { TranCode: "091", TransactionAmount: "149.00", CurrentBalance: "8450.00", TransactionDesc: "UPI/RECHARGE/JIO", PostDate: ago(2), ValueDate: ago(2), Branch: "00437", Terminal: "UPI", Type: "D", JournalNumber: "0609981" },
      { TranCode: "060", TransactionAmount: "6000.00", CurrentBalance: "8599.00", TransactionDesc: "SCHOLARSHIP CREDIT DBT", PostDate: ago(12), ValueDate: ago(12), Branch: "00437", Type: "C", JournalNumber: "0607432" },
    ],
  },
  // Win-back — long dormant, near-zero → "churned"
  "30002709704": {
    name: "SAI KIRAN", balance: "150.00", txns: "1",
    details: [
      { TranCode: "062", TransactionAmount: "12000.00", CurrentBalance: "150.00", TransactionDesc: "IMPS TFR TO OTHER BANK", PostDate: ago(418), ValueDate: ago(418), Branch: "00437", Terminal: "IMPS", Type: "D", JournalNumber: "0421887" },
    ],
  },
};

// Rich KYC profiles (Customer Information / Personal Details Enquiry schema).
const PROFILE: Record<string, Record<string, string>> = {
  "30095497360": { ResponseStatus: "0", Salutation: "MR", FirstName: "SHRIPAD", MiddleName: "RAMESH", LastName: "DHALWALKAR", DateOfBirth: "01011965", GenderCode: "M", MaritalStatus: "M", Occupancy: "O", Persbanker: "Y", WealthFlag: "Y", CustomerRisk: "00", NpaNontrade: "N", PanNumber: "HYTPO8541Y", UidNumber: "XXXXXXXX4521", MobileNumber: "9172142588", Email1: "s.dhalwalkar@example.in", City: "400", State: "27", KycUpdateDate: "02122024", HomeBranch: "61034" },
  "30002561085": { ResponseStatus: "0", Salutation: "MR", FirstName: "SAGAR", LastName: "JAIN", DateOfBirth: "01031990", GenderCode: "M", MaritalStatus: "S", Occupancy: "O", CustomerRisk: "02", NpaNontrade: "N", PanNumber: "AOMPJ3456M", UidNumber: "XXXXXXXX7788", MobileNumber: "8975421047", Email1: "sagar.jain@example.in", City: "400", State: "27", KycUpdateDate: "26032023", HomeBranch: "00437" },
  "30002221458": { ResponseStatus: "0", Salutation: "MR", FirstName: "RAHUL", LastName: "DRAVID", DateOfBirth: "13082009", GenderCode: "M", MaritalStatus: "S", Occupancy: "H", CustomerRisk: "00", NpaNontrade: "N", PanNumber: "BDPPC3627K", UidNumber: "XXXXXXXX2210", MobileNumber: "8500183934", Email1: "", City: "400", State: "27", KycUpdateDate: "26032023", HomeBranch: "00437" },
  "30002709704": { ResponseStatus: "0", Salutation: "MR", FirstName: "SAI", LastName: "KIRAN", DateOfBirth: "10061994", GenderCode: "M", MaritalStatus: "S", Occupancy: "H", CustomerRisk: "00", NpaNontrade: "N", PanNumber: "AIHPA8488P", UidNumber: "XXXXXXXX9931", MobileNumber: "8855996645", Email1: "", City: "500", State: "36", KycUpdateDate: "14082022", HomeBranch: "00437" },
};

function acctOf(body: Record<string, unknown>): string {
  return String(body.AccountNumber ?? body.CifAccountNumber ?? body.corporateAccountNumber ?? "").replace(/^0+/, "") || "30095497360";
}

// Return a schema-faithful mock for the given InnoHub service, or null if the
// service has no mock (caller then surfaces the real error honestly).
export function mockFor(service: string, body: Record<string, unknown>): unknown | null {
  const svc = service.split("/")[0];
  const acct = acctOf(body);

  switch (svc) {
    case "getAccountBalance":
      return {
        message: "SUCCESS",
        data: { corporateAccountNumber: "00000030002046100", bookBalance: "247850.00", availBalance: "247850.00", holdValue: "0.00", unclearBalance: "0.00", aPIResRefNo: `MOCK${Date.now()}` },
        status: "SUCCESS", statusCode: "200",
      };

    case "accountenquiryapi": {
      const e = ENQUIRY[acct] ?? ENQUIRY["30095497360"];
      return { CustomerName: e.name, TotalBalanceClearedBalance: e.balance, NumberOfTransactions: e.txns, AccountNumber: acct, Currency: "INR", AccountDetails: e.details };
    }

    case "customerinformationenquiry":
    case "customerpersonaldetailsenquiry":
      return PROFILE[acct] ?? PROFILE["30095497360"];

    case "accstatementenq": {
      const e = ENQUIRY[acct] ?? ENQUIRY["30095497360"];
      return { AccountNumber: acct, CustomerName: e.name, ClosingBalance: e.balance, Transactions: e.details };
    }

    case "CustomertoCustomerFundTransfer":
      return { Responsestatus: "0", JournalNumber: String(587000000 + Math.floor((Date.now() / 1000) % 900000)), ResponseDescription: "TRANSACTION SUCCESSFUL", Date: ago(0) };

    case "NEFTFundTransfer":
      return { ResponseStatus: "0", UTRNumber: `SBIN${Date.now().toString().slice(-12)}`, ResponseDescription: "NEFT ACCEPTED" };

    case "accountcreation":
      return { ResponseStatus: "0", AccountNumber: `3009${String(Date.now()).slice(-9)}` };

    // ── CIF-360: every account/loan/card linked to the customer ──
    case "cifassociatedaccountenquiry": {
      const P = PORTFOLIO[acct] ?? PORTFOLIO["30095497360"];
      return { ResponseStatus: "0", CIFNumber: P.cif, Accounts: P.accounts };
    }

    // Authoritative account status from the core (we no longer only infer)
    case "accountstatusenquiry": {
      const st: Record<string, { s: string; k: string }> = {
        "30095497360": { s: "ACTIVE", k: "KYC COMPLIANT" },
        "30002561085": { s: "ACTIVE", k: "KYC COMPLIANT" },
        "30002221458": { s: "ACTIVE", k: "KYC COMPLIANT" },
        "30002709704": { s: "DORMANT", k: "KYC DUE" },
      };
      const v = st[acct] ?? st["30095497360"];
      return { ResponseStatus: "0", AccountNumber: acct, AccountStatus: v.s, KYCStatus: v.k, InactiveSince: v.s === "DORMANT" ? "22/06/25" : "" };
    }

    case "monthlyaveragebalance": {
      const mab: Record<string, string[]> = {
        "30095497360": ["812400", "798100", "842156"],
        "30002561085": ["48900", "52300", "56780"],
        "30002221458": ["6100", "7800", "8450"],
        "30002709704": ["150", "150", "150"],
      };
      const v = mab[acct] ?? mab["30095497360"];
      return { ResponseStatus: "0", AccountNumber: acct, MAB: [{ Month: "May26", Amount: v[0] }, { Month: "Jun26", Amount: v[1] }, { Month: "Jul26", Amount: v[2] }] };
    }

    // ── Compliance pre-screen suite ──
    case "amlriskenquiry":
      return { ResponseStatus: "0", AccountNumber: acct, AMLRiskCategory: acct === "30002561085" ? "MEDIUM" : "LOW", LastReviewDate: "14/03/26" };
    case "cifnamescreening":
      return { ResponseStatus: "0", ScreeningResult: "NO MATCH", Lists: ["UNSC", "OFAC", "RBI CAUTION"], ScreenedAt: ago(0) };
    case "npastatusdetails":
      return { ResponseStatus: "0", AccountNumber: acct, NPAStatus: "STANDARD", IRACCode: "1" };

    // ── Persona plays ──
    case "lifecertificateenquiry":
      // Senior pensioner: certificate window approaching — the proactive-service moment
      return acct === "30095497360"
        ? { ResponseStatus: "0", PensionAccount: acct, CertificateStatus: "DUE", DueDate: "30/11/26", LastSubmitted: "18/11/25", Mode: "JEEVAN PRAMAAN / BRANCH" }
        : { ResponseStatus: "0", PensionAccount: acct, CertificateStatus: "NOT APPLICABLE" };
    case "pensionslipenquiry":
      return { ResponseStatus: "0", PensionAccount: acct, Month: "Jul26", BasicPension: "42600", DearnessRelief: "5600", NetCredit: "48200", PPONumber: "PPO/DEF/48-2211" };
    case "nomineesenquiry": {
      const hasNominee = acct === "30002561085"; // everyone else has a gap → protection conversation
      return hasNominee
        ? { ResponseStatus: "0", AccountNumber: acct, Nominees: [{ Name: "P JAIN", Relation: "FATHER", Share: "100" }] }
        : { ResponseStatus: "0", AccountNumber: acct, Nominees: [] };
    }
    case "educationloanenquiry":
      return acct === "30002221458"
        ? { ResponseStatus: "0", Eligible: "Y", Schemes: ["SBI Student Loan", "SBI Scholar Loan (IIT/NIT)"], MaxAmount: "1500000" }
        : { ResponseStatus: "0", Eligible: "N", Schemes: [] };
    case "homeloanintcertificate":
      return { ResponseStatus: "0", AccountNumber: acct, FY: "2025-26", InterestPaid: "0", PrincipalRepaid: "0", Note: "NO ACTIVE HOME LOAN" };

    // ── Consent ceremony (DPDP): OTP issued/verified on the SBI rails ──
    case "sendotp":
      return { ResponseStatus: "0", OTPRefNo: `OTP${String(Date.now()).slice(-8)}`, DeliveredTo: "MOBILE XXXXXX" + acct.slice(-4), ValiditySecs: "180" };
    case "verifyotp":
      // sandbox mock accepts the fixed demo code 482913
      return String(body.OTP ?? "") === "482913"
        ? { ResponseStatus: "0", Verified: "Y", ConsentRefNo: `CNS${String(Date.now()).slice(-8)}` }
        : { ResponseStatus: "1", Verified: "N", ErrorDescription: "OTP MISMATCH" };

    // Account Flag Enquiry (live for SBI test accounts; persona mocks for roster)
    case "accflagenq": {
      const F: Record<string, Record<string, string>> = {
        "30095497360": { FLAG7: "Y", FLAG7_LONG_DESCRIPTION: "PENSIONERS", FLAG10: "V", FLAG10_LONG_DESCRIPTION: "VIP DETAILS", FLAG20: "A", FLAG20_LONG_DESCRIPTION: "ADULT" },
        "30002561085": { FLAG20: "A", FLAG20_LONG_DESCRIPTION: "ADULT" },
        "30002221458": { FLAG20: "M", FLAG20_LONG_DESCRIPTION: "MINOR" },
        "30002709704": {},
      };
      return { ResponseStatus: "0", ErrorDescription: "", ...(F[acct] ?? {}) };
    }
    // Account Mobile Number Enquiry
    case "accmobnumberenq": {
      const M: Record<string, { m: string; v: string }> = {
        "30095497360": { m: "9172142588", v: "Y" },
        "30002561085": { m: "8975421047", v: "Y" },
        "30002221458": { m: "8500183934", v: "Y" },
        "30002709704": { m: "8855996645", v: "N" }, // unverified — service-first win-back nudge
      };
      const e = M[acct] ?? M["30095497360"];
      return { Responsestatus: "0", Mobilenumber: e.m, Oldmobilenumber: e.m, Cifnumber: `000000950841${acct.slice(-5)}`, Isdcode: "91", Verificationflag: e.v, Errordescription: "" };
    }

    // ── Act rails ──
    case "leadgeneration":
      return { ResponseStatus: "0", LeadId: `LEAD${String(Date.now()).slice(-8)}`, Product: String(body.Product ?? "GENERAL"), AssignedTo: "HOME BRANCH RM", SLA: "T+1 CONTACT" };
    case "standinginstructionscreate":
      return { ResponseStatus: "0", SIRefNo: `SI${String(Date.now()).slice(-8)}`, Frequency: String(body.Frequency ?? "MONTHLY"), Status: "ACTIVE" };
    case "smsalert":
      return { ResponseStatus: "0", MessageId: `SMS${String(Date.now()).slice(-8)}`, Status: "QUEUED" };

    default:
      return null;
  }
}

// ── CIF-360 portfolio per customer (Linked Account / CIF Associated schema) ──
const PORTFOLIO: Record<string, { cif: string; accounts: { AccountNumber: string; Type: string; Product: string; Balance: string; Status: string }[] }> = {
  "30095497360": {
    cif: "89012340561",
    accounts: [
      { AccountNumber: "30095497360", Type: "SBA", Product: "SAVINGS PLUS", Balance: "842156.00", Status: "ACTIVE" },
      { AccountNumber: "38812204518", Type: "TDA", Product: "SENIOR CITIZEN FD", Balance: "1500000.00", Status: "ACTIVE" },
      { AccountNumber: "PPF04412876", Type: "PPF", Product: "PUBLIC PROVIDENT FUND", Balance: "486200.00", Status: "ACTIVE" },
    ],
  },
  "30002561085": {
    cif: "89012387224",
    accounts: [
      { AccountNumber: "30002561085", Type: "SBA", Product: "SALARY PACKAGE", Balance: "56780.00", Status: "ACTIVE" },
      { AccountNumber: "44120987765", Type: "RD", Product: "RECURRING DEPOSIT", Balance: "96000.00", Status: "ACTIVE" },
      { AccountNumber: "CC5187XXXX", Type: "CC", Product: "SBI CARD PRIME", Balance: "-18450.00", Status: "ACTIVE" },
    ],
  },
  "30002221458": {
    cif: "89012399810",
    accounts: [{ AccountNumber: "30002221458", Type: "SBA", Product: "PEHLA KADAM (MINOR)", Balance: "8450.00", Status: "ACTIVE" }],
  },
  "30002709704": {
    cif: "89012311102",
    accounts: [
      { AccountNumber: "30002709704", Type: "SBA", Product: "REGULAR SAVINGS", Balance: "150.00", Status: "DORMANT" },
      { AccountNumber: "37765540921", Type: "TDA", Product: "FIXED DEPOSIT (MATURED)", Balance: "0.00", Status: "CLOSED" },
    ],
  },
};
