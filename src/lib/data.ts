// ─────────────────────────────────────────────────────────────
// SBI AURA — Synthetic Customer Digital Twin dataset
// All data below is fully synthetic, generated for demo purposes.
// ─────────────────────────────────────────────────────────────

export type Signal = {
  id: string;
  type: "transaction" | "app" | "life-event" | "bureau" | "branch";
  label: string;
  detail: string;
  time: string;
  strength: "low" | "medium" | "high";
};

export type MemoryEntry = {
  id: string;
  kind: "episodic" | "semantic";
  text: string;
  time: string;
};

export type AgentStep = {
  agent: string;
  icon: string;
  finding: string;
  confidence: number;
};

export type NextBestAction = {
  action: string;
  product: string;
  rationale: string;
  channel: string;
  timing: string;
  language: string;
  compliance: { rule: string; status: "pass" | "review" }[];
  message: string;
};

export type Customer = {
  id: string;
  name: string;
  age: number;
  segment: string;
  location: string;
  language: string;
  avatarHue: number;
  products: string[];
  balance: string;
  relationshipYears: number;
  yonoActive: boolean;
  twinSummary: string;
  goals: string[];
  signals: Signal[];
  memory: MemoryEntry[];
  // Precomputed fallback (used if the live reasoning API is unreachable)
  fallback: {
    steps: AgentStep[];
    nba: NextBestAction;
    chatOpener: string;
  };
  personaPrompt: string;
};

export const customers: Customer[] = [
  {
    id: "priya",
    name: "Priya Sharma",
    age: 29,
    segment: "Salaried Professional",
    location: "Bengaluru, KA",
    language: "English / Hindi",
    avatarHue: 205,
    products: ["Savings A/c", "YONO", "Credit Card"],
    balance: "₹4.2L",
    relationshipYears: 6,
    yonoActive: true,
    twinSummary:
      "Tech professional, disciplined saver. Salary credits of ₹1.4L/month. Recently browsing home-loan calculators and property listings inside YONO. Rent payments to a Whitefield landlord for 3 years.",
    goals: ["First home by 2027", "Emergency fund of 6 months", "Tax-efficient investing"],
    signals: [
      { id: "s1", type: "transaction", label: "Salary credit ↑ 18%", detail: "₹1.42L credited — increment detected vs. 6-month baseline", time: "2d ago", strength: "high" },
      { id: "s2", type: "app", label: "Home-loan EMI calculator", detail: "Used 4× this week inside YONO, avg loan explored ₹65L", time: "1d ago", strength: "high" },
      { id: "s3", type: "app", label: "Property search dwell", detail: "11 min on YONO real-estate partner page (Whitefield 2BHK)", time: "18h ago", strength: "medium" },
      { id: "s4", type: "transaction", label: "Rent UPI ₹32,000", detail: "36th consecutive monthly payment to same payee", time: "3d ago", strength: "medium" },
      { id: "s5", type: "bureau", label: "CIBIL 812 · no active loans", detail: "Bureau refresh — strong eligibility headroom", time: "1w ago", strength: "medium" },
    ],
    memory: [
      { id: "m1", kind: "episodic", text: "Mar 2026 — asked RM about tax-saver FD, chose ELSS instead after comparison journey.", time: "Mar 2026" },
      { id: "m2", kind: "episodic", text: "Jan 2026 — dismissed generic personal-loan push notification within 2 seconds.", time: "Jan 2026" },
      { id: "m3", kind: "semantic", text: "Prefers WhatsApp over calls. Reads messages after 7pm. Responds to data-backed nudges, ignores discount language.", time: "learned" },
      { id: "m4", kind: "semantic", text: "Financial style: researches 2–3 weeks before committing. Values step-by-step breakdowns.", time: "learned" },
    ],
    fallback: {
      steps: [
        { agent: "Sensor Agent", icon: "radar", finding: "Correlated salary increment (+18%) with 4× home-loan calculator sessions and sustained rent outflow of ₹32K/month.", confidence: 0.94 },
        { agent: "Life-Event Agent", icon: "sparkles", finding: "High-probability life event: FIRST HOME PURCHASE window opening in 30–90 days. Rent-to-EMI crossover is favourable.", confidence: 0.91 },
        { agent: "Risk & Compliance Agent", icon: "shield", finding: "CIBIL 812, FOIR 22% post-EMI — well within norms. DPDP consent for bureau + behavioural data verified. No mis-sell flags.", confidence: 0.98 },
        { agent: "Offer Agent", icon: "gift", finding: "Next-best-action: pre-approved SBI MaxGain Home Loan ₹68L @ 8.15%, zero processing fee. EMI ₹34,900 ≈ current rent + ₹2,900.", confidence: 0.89 },
        { agent: "Conversation Agent", icon: "message", finding: "Drafted WhatsApp message in English, data-first tone (matches Twin memory: ignores discount language, responds to numbers). Scheduled 7:15pm.", confidence: 0.92 },
      ],
      nba: {
        action: "Proactive home-loan conversation",
        product: "SBI MaxGain Home Loan — pre-approved ₹68L",
        rationale: "Rent (₹32K) ≈ projected EMI (₹34.9K). Salary increment + 4× calculator usage + 36 months stable rent = peak intent window.",
        channel: "WhatsApp",
        timing: "Today 7:15 PM (post-work reading window)",
        language: "English",
        compliance: [
          { rule: "RBI Digital Lending Guidelines — KFS ready", status: "pass" },
          { rule: "DPDP consent for behavioural signals", status: "pass" },
          { rule: "Suitability & appropriateness check", status: "pass" },
          { rule: "Cooling-off & human-override enabled", status: "pass" },
        ],
        message:
          "Hi Priya! Noticed you've been exploring home-loan options on YONO. Here's something real: you've paid ₹11.5L in rent over 3 years. A pre-approved MaxGain loan of ₹68L would put your EMI at ₹34,900 — just ₹2,900 above your current rent. Want a personalised breakdown? No forms, 2 taps. — AURA, your SBI relationship assistant",
      },
      chatOpener:
        "Hi Priya! 👋 I'm AURA, your SBI relationship assistant. I noticed you've been exploring home-loan calculators on YONO — and congratulations on the increment! Would you like me to show what a ₹68L pre-approved home loan looks like against your current rent?",
    },
    personaPrompt:
      "Customer: Priya Sharma, 29, Bengaluru tech professional, salary ₹1.4L/mo (just got 18% increment), pays ₹32K rent, CIBIL 812, browsing home loan calculators in YONO. Prefers data-backed, no-fluff answers. Goal: first home by 2027. Pre-approved for SBI MaxGain Home Loan ₹68L @ 8.15%, EMI ₹34,900.",
  },
  {
    id: "ramesh",
    name: "Ramesh Yadav",
    age: 46,
    segment: "Agri / Jan Dhan+",
    location: "Sitapur, UP",
    language: "Hindi",
    avatarHue: 145,
    products: ["Jan Dhan A/c", "Kisan Credit Card", "PMJJBY"],
    balance: "₹86K",
    relationshipYears: 9,
    yonoActive: false,
    twinSummary:
      "Sugarcane farmer, 4-acre holding. Seasonal income cycles — large mill payments in Nov–Jan. KCC utilisation at 85%. Recent mandi payment credited. Daughter's school fee payments observed every quarter.",
    goals: ["Daughter's higher education", "Drip irrigation upgrade", "Reduce informal borrowing"],
    signals: [
      { id: "s1", type: "transaction", label: "Mill payment ₹1.9L credited", detail: "Seasonal sugarcane settlement from Sitapur co-op mill", time: "4d ago", strength: "high" },
      { id: "s2", type: "transaction", label: "Withdrawal pattern shift", detail: "₹1.4L withdrawn within 48h of credit — historically flows to informal lender repayment", time: "2d ago", strength: "high" },
      { id: "s3", type: "branch", label: "Branch visit — education query", detail: "Asked about education loan for daughter's B.Tech admission (CSAB round)", time: "1w ago", strength: "high" },
      { id: "s4", type: "life-event", label: "Daughter cleared JEE", detail: "Fee payment ₹4,500 to JoSAA counselling detected", time: "9d ago", strength: "high" },
      { id: "s5", type: "transaction", label: "KCC at 85% limit", detail: "₹1.7L of ₹2L drawn — renewal due in 45 days", time: "ongoing", strength: "medium" },
    ],
    memory: [
      { id: "m1", kind: "episodic", text: "Nov 2025 — repaid KCC dues 11 days early after mill settlement. Third year running.", time: "Nov 2025" },
      { id: "m2", kind: "episodic", text: "Jun 2025 — missed PMJJBY renewal, reinstated after branch reminder call in Hindi.", time: "Jun 2025" },
      { id: "m3", kind: "semantic", text: "Trusts voice + branch over app. Responds to IVR in Hindi. Best reach: 8–9pm after fieldwork.", time: "learned" },
      { id: "m4", kind: "semantic", text: "Family-goal driven. Daughter Kavita is the household's education priority.", time: "learned" },
    ],
    fallback: {
      steps: [
        { agent: "Sensor Agent", icon: "radar", finding: "Detected JoSAA counselling fee + branch education-loan query + seasonal ₹1.9L credit. Cross-referenced with historical post-harvest outflow to informal lenders.", confidence: 0.93 },
        { agent: "Life-Event Agent", icon: "sparkles", finding: "Confirmed life event: DAUGHTER'S ENGINEERING ADMISSION (JEE cleared, CSAB round active). Decision window: 2–3 weeks.", confidence: 0.95 },
        { agent: "Risk & Compliance Agent", icon: "shield", finding: "9-year relationship, 3 years early KCC repayment. Education loan under CSIS eligible — interest subsidy applies. Priority-sector norms satisfied.", confidence: 0.97 },
        { agent: "Offer Agent", icon: "gift", finding: "Next-best-action: SBI Scholar education loan ₹8L (collateral-free) + intercept informal borrowing with KCC top-up at renewal.", confidence: 0.9 },
        { agent: "Conversation Agent", icon: "message", finding: "Voice-first outreach in Hindi at 8:15pm via IVR-assist, branch RM follow-up booked. App push suppressed (Twin: low app trust).", confidence: 0.94 },
      ],
      nba: {
        action: "Education-loan outreach before informal borrowing",
        product: "SBI Scholar Loan ₹8L @ 8.55% (CSIS subsidy eligible)",
        rationale: "Daughter's admission window is 2–3 weeks. Historical pattern shows informal lender usage post-harvest — bank can intercept with cheaper, subsidised credit.",
        channel: "Voice (Hindi IVR) + Branch RM co-pilot",
        timing: "Today 8:15 PM (post-fieldwork window)",
        language: "Hindi",
        compliance: [
          { rule: "Priority Sector Lending norms", status: "pass" },
          { rule: "CSIS interest-subsidy eligibility", status: "pass" },
          { rule: "Fair Practices Code — vernacular disclosure", status: "pass" },
          { rule: "Human RM in loop for rural segment", status: "pass" },
        ],
        message:
          "नमस्ते रमेश जी! कविता के JEE पास करने पर बधाई! 🎉 उसकी इंजीनियरिंग पढ़ाई के लिए SBI Scholar लोन — ₹8 लाख तक, बिना गारंटी, सरकारी ब्याज सब्सिडी के साथ। कल शाम आपकी शाखा के राजेश जी आपको फ़ोन करेंगे। — आपका SBI",
      },
      chatOpener:
        "नमस्ते रमेश जी! 🙏 मैं AURA हूँ, आपका SBI सहायक। कविता बिटिया के JEE पास करने की बहुत बधाई! उसकी इंजीनियरिंग की फीस के लिए SBI Scholar एजुकेशन लोन के बारे में जानना चाहेंगे? बिना गारंटी, ब्याज सब्सिडी के साथ।",
    },
    personaPrompt:
      "Customer: Ramesh Yadav, 46, sugarcane farmer in Sitapur UP, Hindi speaker, 9-year SBI customer, Jan Dhan + Kisan Credit Card. Daughter Kavita just cleared JEE, needs education loan (~₹8L, SBI Scholar, CSIS subsidy eligible). Historically borrows from informal lenders post-harvest. Prefers simple Hindi, voice/branch over app. Respond in simple Hindi (Devanagari) with warmth.",
  },
  {
    id: "meera",
    name: "Meera Krishnan",
    age: 63,
    segment: "Senior / Pensioner",
    location: "Coimbatore, TN",
    language: "Tamil / English",
    avatarHue: 25,
    products: ["Pension A/c", "3 Fixed Deposits", "Locker"],
    balance: "₹28.6L",
    relationshipYears: 31,
    yonoActive: false,
    twinSummary:
      "Retired school principal, 31-year SBI relationship. ₹18L FD maturing in 12 days. Pension credits regular. Recent large hospital payment observed. Historically rolls over FDs at branch — but branch visits have stopped since knee surgery.",
    goals: ["Steady retirement income", "Medical corpus", "Simplify money matters for family"],
    signals: [
      { id: "s1", type: "life-event", label: "FD ₹18L maturing in 12 days", detail: "31-year customer, historically rolls over in-branch", time: "12d out", strength: "high" },
      { id: "s2", type: "transaction", label: "Hospital payment ₹2.1L", detail: "Orthopaedic centre, Coimbatore — knee replacement", time: "3w ago", strength: "high" },
      { id: "s3", type: "branch", label: "Branch visits stopped", detail: "First 90-day gap in 31 years — mobility constraint inferred", time: "90d window", strength: "high" },
      { id: "s4", type: "app", label: "Family member added as nominee query", detail: "Son (Arjun, Chennai) called contact centre about nominee update", time: "2w ago", strength: "medium" },
      { id: "s5", type: "transaction", label: "Pharmacy standing pattern ₹8.4K/mo", detail: "New recurring medical expense post-surgery", time: "recurring", strength: "medium" },
    ],
    memory: [
      { id: "m1", kind: "episodic", text: "2023 — declined internet banking twice; 'I trust Mr. Subramaniam at the branch'.", time: "2023" },
      { id: "m2", kind: "episodic", text: "Feb 2026 — contact-centre call: asked if FD renewal can be done 'without coming to branch'.", time: "Feb 2026" },
      { id: "m3", kind: "semantic", text: "High trust, low digital confidence. Values continuity — same branch, same officer. Son Arjun is emerging financial delegate.", time: "learned" },
      { id: "m4", kind: "semantic", text: "Risk-averse: 100% FD/pension. Interested in senior-citizen rates, never equity.", time: "learned" },
    ],
    fallback: {
      steps: [
        { agent: "Sensor Agent", icon: "radar", finding: "FD maturity T-12d + 90-day branch absence + ₹2.1L orthopaedic payment. Pattern break on a 31-year in-branch rollover habit.", confidence: 0.96 },
        { agent: "Life-Event Agent", icon: "sparkles", finding: "Life event: POST-SURGERY MOBILITY CONSTRAINT. Dormancy risk on rollover — ₹18L may idle in savings or leak to another bank via son's channel.", confidence: 0.92 },
        { agent: "Risk & Compliance Agent", icon: "shield", finding: "Senior-citizen protocols: doorstep banking eligible (70+ waiver approved on medical grounds). Nominee update flagged for assisted completion. No unsuitable-product risk.", confidence: 0.98 },
        { agent: "Offer Agent", icon: "gift", finding: "Next-best-action: doorstep FD renewal at SBI WeCare senior rate (7.6%) + laddered split (₹12L/₹6L) for medical liquidity + assisted nominee update in same visit.", confidence: 0.91 },
        { agent: "Conversation Agent", icon: "message", finding: "Voice call from her home branch (known caller ID), Tamil-first script, son Arjun CC'd on confirmation SMS per consent. No app nudges.", confidence: 0.95 },
      ],
      nba: {
        action: "Doorstep FD renewal + care visit",
        product: "SBI WeCare FD 7.6% — laddered ₹12L + ₹6L",
        rationale: "31-year loyal customer at silent-attrition risk due to mobility. Doorstep service converts a vulnerability moment into a loyalty moment.",
        channel: "Branch RM doorstep visit + Tamil voice call",
        timing: "Call tomorrow 10:30 AM; visit within 5 days",
        language: "Tamil",
        compliance: [
          { rule: "Senior Citizen doorstep-banking policy", status: "pass" },
          { rule: "Suitability — deposit-only products", status: "pass" },
          { rule: "Nominee/succession assisted process", status: "pass" },
          { rule: "Consent for family CC on comms", status: "review" },
        ],
        message:
          "வணக்கம் மீரா அம்மா! உங்கள் ₹18 லட்சம் FD 12 நாட்களில் முதிர்வடைகிறது. உங்கள் கிளையிலிருந்து சுப்ரமணியம் நாளை காலை 10:30க்கு அழைப்பார் — வீட்டிலேயே புதுப்பிக்கலாம், வங்கிக்கு வர வேண்டாம். சீக்கிரம் குணமாகுங்கள்! — உங்கள் SBI",
      },
      chatOpener:
        "வணக்கம் மீரா அம்மா! I'm AURA from SBI. Your ₹18L fixed deposit matures in 12 days — and we know visiting the branch is difficult right now. Shall I arrange a doorstep renewal at our special senior-citizen rate of 7.6%? Mr. Subramaniam from your branch can visit you at home.",
    },
    personaPrompt:
      "Customer: Meera Krishnan, 63, retired school principal, Coimbatore, 31-year SBI customer. ₹18L FD maturing in 12 days, recovering from knee surgery (can't visit branch), risk-averse (FDs only), trusts branch officer Subramaniam, son Arjun in Chennai helps. Eligible for doorstep banking + SBI WeCare 7.6% senior FD rate. Respond warmly, mix Tamil greeting with simple English, short sentences, no jargon.",
  },
  {
    id: "arjun",
    name: "Arjun Mehta",
    age: 34,
    segment: "MSME / Business",
    location: "Surat, GJ",
    language: "Gujarati / English",
    avatarHue: 280,
    products: ["Current A/c", "OD Facility ₹25L", "POS Terminal"],
    balance: "₹11.3L",
    relationshipYears: 7,
    yonoActive: true,
    twinSummary:
      "Textile trader — synthetic saree exports. GST-linked turnover ₹3.8Cr/yr, growing 22% YoY. POS + UPI collections up 40% this quarter. OD utilisation spiking to 92% around Diwali inventory build. Two bounced vendor payments last month — cash-flow stress signal.",
    goals: ["Working-capital headroom for festive season", "Export expansion to UAE", "Formalise business credit"],
    signals: [
      { id: "s1", type: "transaction", label: "OD at 92% — stress zone", detail: "₹23L of ₹25L drawn; historically peaks at 70% pre-festive", time: "now", strength: "high" },
      { id: "s2", type: "transaction", label: "2 vendor payments bounced", detail: "₹4.2L and ₹2.8L — first bounces in 7-year history", time: "3w ago", strength: "high" },
      { id: "s3", type: "transaction", label: "Collections up 40% QoQ", detail: "POS + UPI inflows ₹94L this quarter — demand is strong, this is growth stress not distress", time: "quarter", strength: "high" },
      { id: "s4", type: "app", label: "Export LC page views", detail: "Viewed letter-of-credit and forex services 3× on YONO Business", time: "5d ago", strength: "medium" },
      { id: "s5", type: "bureau", label: "GST filings on time, 24/24", detail: "Turnover ₹3.8Cr, up 22% YoY — enhancement eligible", time: "1w ago", strength: "medium" },
    ],
    memory: [
      { id: "m1", kind: "episodic", text: "Oct 2025 — requested OD enhancement informally at branch, paperwork never completed (time-poor).", time: "Oct 2025" },
      { id: "m2", kind: "episodic", text: "Aug 2025 — used invoice-discounting once, repaid in 22 days, liked the speed.", time: "Aug 2025" },
      { id: "m3", kind: "semantic", text: "Time-poor, decisive. Responds to WhatsApp within minutes during business hours. Hates paperwork; loves pre-filled digital journeys.", time: "learned" },
      { id: "m4", kind: "semantic", text: "Growth-stage mindset — frames everything as ROI. Festive season = 40% of annual revenue.", time: "learned" },
    ],
    fallback: {
      steps: [
        { agent: "Sensor Agent", icon: "radar", finding: "OD 92% + first-ever bounces + collections up 40%. Classified as GROWTH-DRIVEN liquidity crunch, not credit deterioration.", confidence: 0.92 },
        { agent: "Life-Event Agent", icon: "sparkles", finding: "Business event: FESTIVE INVENTORY BUILD colliding with export-expansion ambition. 6-week critical window before Diwali order book closes.", confidence: 0.9 },
        { agent: "Risk & Compliance Agent", icon: "shield", finding: "GST 24/24 on time, 22% YoY growth — OD enhancement to ₹40L within delegated norms. Bounce incidents explained by timing mismatch, not intent. MSME Samadhaan clean.", confidence: 0.95 },
        { agent: "Offer Agent", icon: "gift", finding: "Next-best-action: pre-approved GST-based OD enhancement ₹25L→₹40L + invoice-discounting line for export receivables. Pre-filled from GST data — 3-tap acceptance.", confidence: 0.93 },
        { agent: "Conversation Agent", icon: "message", finding: "WhatsApp Business message, English, ROI-framed, sent 11am (his decision window). One-tap deep link into pre-filled YONO Business journey.", confidence: 0.94 },
      ],
      nba: {
        action: "Working-capital rescue before festive peak",
        product: "GST-based OD enhancement ₹25L → ₹40L + invoice discounting",
        rationale: "Strong demand (+40% collections) is outrunning credit line. Two bounces = urgent. Intervening now prevents NPA-path stress AND captures festive upside.",
        channel: "WhatsApp Business → YONO Business deep link",
        timing: "Today 11:00 AM (peak decision window)",
        language: "English",
        compliance: [
          { rule: "MSME lending — delegated sanction norms", status: "pass" },
          { rule: "GST-consent data usage (AA framework)", status: "pass" },
          { rule: "RBI working-capital renewal guidelines", status: "pass" },
          { rule: "Transparent pricing disclosure (KFS)", status: "pass" },
        ],
        message:
          "Arjun bhai, your collections are up 40% — but your OD is at 92% and two vendor payments bounced. That's growth outrunning your limit. Based on your GST record, you're pre-approved to enhance ₹25L → ₹40L. Pre-filled, 3 taps, sanction today. Festive stock shouldn't wait. — AURA, SBI Business",
      },
      chatOpener:
        "Hi Arjun! I'm AURA from SBI Business. Quick one — your collections are up 40% this quarter (great going 🚀), but your OD is at 92% and we noticed two vendor payment bounces. You're pre-approved for an enhancement to ₹40L based on your GST record. Want me to walk you through it? Takes 3 taps.",
    },
    personaPrompt:
      "Customer: Arjun Mehta, 34, textile trader in Surat, ₹3.8Cr GST turnover growing 22% YoY, OD ₹25L at 92% utilisation, 2 recent vendor payment bounces (growth stress, not distress), collections up 40%. Pre-approved OD enhancement to ₹40L + invoice discounting. Time-poor, ROI-focused, hates paperwork. Respond crisp, numbers-first, business-partner tone in English.",
  },
];

export const agentRoster = [
  { key: "sensor", name: "Sensor Agent", icon: "radar", desc: "Streams transactions, app behaviour, bureau & branch signals into the Twin" },
  { key: "life", name: "Life-Event Agent", icon: "sparkles", desc: "Infers life moments & financial stress from correlated patterns" },
  { key: "risk", name: "Risk & Compliance Agent", icon: "shield", desc: "RBI / DPDP guardrails, suitability & consent checks on every action" },
  { key: "offer", name: "Offer Agent", icon: "gift", desc: "Selects the next-best-action from the eligible product universe" },
  { key: "conversation", name: "Conversation Agent", icon: "message", desc: "Personalises tone, language & timing across 22 languages" },
  { key: "feedback", name: "Feedback Agent", icon: "refresh", desc: "Writes every outcome back into the Twin's memory — the learning loop" },
];

export function getCustomer(id: string) {
  return customers.find((c) => c.id === id);
}
