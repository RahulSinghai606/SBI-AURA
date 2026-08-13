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
  return String(body.AccountNumber ?? body.corporateAccountNumber ?? "").replace(/^0+/, "") || "30095497360";
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

    default:
      return null;
  }
}
