"use client";

// AURA Platform Operations Console
// Everything here is LIVE, not mocked: the kill switch actually blocks the
// agent APIs; metrics/traces/audit events stream from the running control
// plane; security headers are fetched and verified in-browser; the load test
// fires real requests and plots real latencies; the DPDP guard calls Azure
// AI Language PII detection; the SBI panel calls the real InnoHub sandbox.

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Power,
  Activity,
  ShieldCheck,
  Gauge,
  Lock,
  CheckCircle2,
  XCircle,
  Radio,
  Cpu,
  Database,
  Layers,
  ScanLine,
  Play,
  FileSearch,
  Server,
  GitBranch,
  Bell,
  Landmark,
} from "lucide-react";

type Metrics = {
  killSwitch: { engaged: boolean; by: string; at: number | null; reason: string };
  counters: Record<string, number>;
  kpi?: { opportunitiesProposed: number; officerApprovalRate: number | null; leadsFiled: number; standingInstructions: number; consentVerified: number; pendingReview: number };
  p50: number;
  p95: number;
  p99: number;
  traces: { id: string; route: string; totalMs: number; spans: { name: string; startMs: number; durMs: number; status: string; note?: string }[] }[];
  events: { seq: number; at: number; actor: string; action: string; severity: string }[];
  dataEvents: { seq: number; at: number; api: string; account: string; fields: number; ms: number }[];
  actions: { id: string; at: number; type: string; summary: string; customer: string; account: string; status: string; result?: string; decidedBy?: string }[];
  uptimeSec: number;
};

const HEADo = [
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy",
];

const RBI_CONTROLS = [
  { reg: "RBI Cyber Security Framework for Banks", how: "SOC event stream · VAPT cycle integrated · kill switch as containment control" },
  { reg: "RBI Master Direction — IT Governance (2023)", how: "Human-in-the-loop on every outreach · full audit trail of agent decisions" },
  { reg: "DPDP Act 2023", how: "PII detected & redacted before any LLM call · purpose limitation · consent-first engagement" },
  { reg: "RBI outsourcing of IT services directions", how: "Single-tenant deployment option · data residency in-region · vendor audit trail" },
];

export default function OpsConsole() {
  const [m, setM] = useState<Metrics | null>(null);
  const [killBusy, setKillBusy] = useState(false);
  const [headers, setHeaders] = useState<Record<string, string | null> | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadResult, setLoadResult] = useState<{ n: number; p50: number; p95: number; max: number; rps: number } | null>(null);
  const [piiIn, setPiiIn] = useState("Customer Priya Nair, PAN ABCPN4321K, mobile 9812345670, asked about a home loan top-up after her salary credit.");
  const [piiOut, setPiiOut] = useState<{ redactedText: string; entities: { text: string; category: string }[]; ms: number } | null>(null);
  const [piiBusy, setPiiBusy] = useState(false);
  const [sbiBusy, setSbiBusy] = useState(false);
  const [sbiOut, setSbiOut] = useState<{ live: boolean; ms: number; data?: { availBalance: string; corporateAccountNumber: string; aPIResRefNo: string }; error?: string } | null>(null);
  const pollRef = useRef<number>(0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/metrics", { cache: "no-store" });
      setM(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = window.setInterval(poll, 2500);
    // live header self-check
    fetch(window.location.href, { method: "HEAD" }).then((r) => {
      const h: Record<string, string | null> = {};
      HEADo.forEach((k) => (h[k] = r.headers.get(k)));
      setHeaders(h);
    });
    return () => window.clearInterval(pollRef.current);
  }, [poll]);

  const toggleKill = async () => {
    if (!m) return;
    setKillBusy(true);
    await fetch("/api/ops/kill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engaged: !m.killSwitch.engaged, reason: !m.killSwitch.engaged ? "manual emergency stop from ops console" : "" }),
    });
    await poll();
    setKillBusy(false);
  };

  const runLoadTest = async () => {
    setLoadBusy(true);
    setLoadResult(null);
    const N = 60;
    const t0 = performance.now();
    const lat: number[] = [];
    await Promise.all(
      Array.from({ length: N }, async () => {
        const s = performance.now();
        await fetch("/api/health", { cache: "no-store" });
        lat.push(performance.now() - s);
      })
    );
    const wall = (performance.now() - t0) / 1000;
    lat.sort((a, b) => a - b);
    setLoadResult({
      n: N,
      p50: Math.round(lat[Math.floor(N * 0.5)]),
      p95: Math.round(lat[Math.floor(N * 0.95)]),
      max: Math.round(lat[N - 1]),
      rps: Math.round(N / wall),
    });
    setLoadBusy(false);
    poll();
  };

  const runPii = async () => {
    setPiiBusy(true);
    setPiiOut(null);
    try {
      const res = await fetch("/api/pii", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: piiIn }) });
      setPiiOut(await res.json());
    } catch {}
    setPiiBusy(false);
    poll();
  };

  const [decideBusy, setDecideBusy] = useState<string | null>(null);
  // maker-checker disposition — only an approval touches the SBI core
  const decide = async (id: string, decision: "approve" | "reject") => {
    setDecideBusy(id);
    try {
      await fetch("/api/ops/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
    } catch {}
    await poll();
    setDecideBusy(null);
  };

  const runSbi = async () => {
    setSbiBusy(true);
    setSbiOut(null);
    try {
      const res = await fetch("/api/sbi/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setSbiOut(await res.json());
    } catch {}
    setSbiBusy(false);
    poll();
  };

  const engaged = m?.killSwitch.engaged ?? false;

  return (
    <main className={`min-h-screen transition-colors duration-700 ${engaged ? "bg-[#1a0e0e]" : "aurora-bg"} noise`}>
      {/* header */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${engaged ? "border-red-900/50 bg-[#240f0f]/80" : "border-line/70 bg-white/75"}`}>
        <div className="mx-auto max-w-[1560px] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`p-2 rounded-lg transition-colors ${engaged ? "hover:bg-white/10" : "hover:bg-bg"}`} aria-label="Back">
              <ArrowLeft className={`w-4 h-4 ${engaged ? "text-red-200" : "text-ink-soft"}`} />
            </Link>
            <Image src="/kellton-logo.jpg" alt="Kellton" width={84} height={24} className="h-5 w-auto rounded" />
            <span className={`h-5 w-px ${engaged ? "bg-red-900" : "bg-line"}`} />
            <span className={`font-display font-semibold ${engaged ? "text-red-100" : "text-navy"}`}>
              AURA <span className={engaged ? "text-red-400" : "text-gradient"}>Platform Ops</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide rounded-full px-3 py-1 ${engaged ? "text-red-300 bg-red-500/15" : "text-teal bg-teal/10"}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${engaged ? "bg-red-400" : "bg-teal"}`} />
              {engaged ? "AGENTS SUSPENDED" : "ALL SYSTEMS NOMINAL"}
            </span>
            <Link href="/demo" className={`text-sm font-semibold ${engaged ? "text-red-200 hover:text-white" : "text-sbi hover:text-navy"} transition-colors`}>
              Command Center →
            </Link>
            <Image src="/sbi-logo.webp" alt="SBI" width={60} height={26} className="h-7 w-auto" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] px-4 sm:px-6 py-6 grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ═══ KILL SWITCH ═══ */}
        <section className={`rounded-3xl border card-elevate p-6 transition-colors duration-700 xl:col-span-1 ${engaged ? "bg-[#2a1212] border-red-800/60" : "bg-surface border-line"}`}>
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <Power className="w-4 h-4" /> Emergency kill switch
          </p>

          <div className="flex flex-col items-center py-4">
            <button
              onClick={toggleKill}
              disabled={killBusy}
              aria-label="Toggle kill switch"
              className={`relative w-40 h-40 rounded-full border-8 transition-all duration-500 flex items-center justify-center group ${
                engaged
                  ? "bg-red-600 border-red-900 shadow-[0_0_60px_10px_rgba(220,38,38,0.5)] animate-pulse"
                  : "bg-surface border-line hover:border-red-400/60 card-elevate"
              }`}
            >
              <Power className={`w-16 h-16 transition-colors ${engaged ? "text-white" : "text-red-500 group-hover:scale-110 transition-transform"}`} strokeWidth={2.2} />
            </button>
            <p className={`mt-5 font-display text-xl font-semibold text-center ${engaged ? "text-red-200" : "text-navy"}`}>
              {engaged ? "AGENTIC ENGAGEMENT SUSPENDED" : "Agent swarm active"}
            </p>
            <p className={`text-xs text-center mt-1 max-w-[240px] leading-relaxed ${engaged ? "text-red-300/80" : "text-ink-soft"}`}>
              {engaged
                ? "Every agent invocation is blocked at the control plane (HTTP 423). No customer is contacted. Event on the audit trail."
                : "One press halts every LLM/agent call platform-wide — no outreach leaves the bank without humans in control."}
            </p>
            {m?.killSwitch.at && (
              <p className={`mt-3 text-[10px] font-mono ${engaged ? "text-red-400/80" : "text-ink-faint"}`}>
                last change: {new Date(m.killSwitch.at).toLocaleTimeString("en-IN", { hour12: false })} · by {m.killSwitch.by || "—"}
              </p>
            )}
            <div className={`mt-4 rounded-xl px-4 py-2 text-[11px] font-semibold ${engaged ? "bg-red-500/15 text-red-300" : "bg-bg text-ink-soft border border-line"}`}>
              Blocked invocations: <span className="font-display text-base">{m?.counters.blockedByKill ?? 0}</span>
            </div>
          </div>

          {/* RBI / DPDP control mapping */}
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mt-4 mb-3 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <FileSearch className="w-4 h-4" /> Regulatory control mapping
          </p>
          <div className="space-y-2">
            {RBI_CONTROLS.map((c) => (
              <div key={c.reg} className={`rounded-xl p-3 border ${engaged ? "bg-white/5 border-red-900/40" : "bg-bg border-line"}`}>
                <p className={`text-xs font-bold ${engaged ? "text-red-100" : "text-navy"}`}>{c.reg}</p>
                <p className={`text-[11px] mt-0.5 leading-relaxed ${engaged ? "text-red-300/70" : "text-ink-soft"}`}>{c.how}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ OBSERVABILITY ═══ */}
        <section className={`rounded-3xl border card-elevate p-6 xl:col-span-2 ${engaged ? "bg-[#20100e] border-red-900/40" : "bg-surface border-line"}`}>
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <Activity className="w-4 h-4" /> Observability — live control plane
          </p>

          {/* metric tiles */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
            {[
              { Icon: Server, label: "Requests", v: m?.counters.requests ?? 0 },
              { Icon: Cpu, label: "LLM calls", v: m?.counters.llmCalls ?? 0 },
              { Icon: Landmark, label: "SBI API calls", v: m?.counters.sbiApiCalls ?? 0 },
              { Icon: ScanLine, label: "PII scans", v: m?.counters.piiScans ?? 0 },
              { Icon: Gauge, label: "p95 ms", v: m?.p95 ?? 0 },
              { Icon: Bell, label: "Blocked", v: m?.counters.blockedByKill ?? 0 },
            ].map((t) => (
              <div key={t.label} className={`rounded-2xl px-3 py-3 border text-center ${engaged ? "bg-white/5 border-red-900/40" : "bg-bg border-line"}`}>
                <t.Icon className={`w-4 h-4 mx-auto mb-1 ${engaged ? "text-red-300" : "text-cyan"}`} />
                <p className={`font-display text-xl font-semibold ${engaged ? "text-red-100" : "text-navy"}`}>{t.v}</p>
                <p className={`text-[9px] uppercase tracking-wide ${engaged ? "text-red-400/70" : "text-ink-faint"}`}>{t.label}</p>
              </div>
            ))}
          </div>

          {/* business KPIs — outcomes, not plumbing */}
          <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>Business outcomes — engagement funnel</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
            {[
              { label: "Opportunities", v: m?.kpi?.opportunitiesProposed ?? 0 },
              { label: "Consents ✓", v: m?.kpi?.consentVerified ?? 0 },
              { label: "Approval rate", v: m?.kpi?.officerApprovalRate != null ? `${m.kpi.officerApprovalRate}%` : "—" },
              { label: "Leads filed", v: m?.kpi?.leadsFiled ?? 0 },
              { label: "Standing instr.", v: m?.kpi?.standingInstructions ?? 0 },
              { label: "Pending review", v: m?.kpi?.pendingReview ?? 0 },
            ].map((t) => (
              <div key={t.label} className={`rounded-2xl px-3 py-3 border text-center ${engaged ? "bg-white/5 border-red-900/40" : "bg-teal/5 border-teal/30"}`}>
                <p className={`font-display text-xl font-semibold ${engaged ? "text-red-100" : "text-teal"}`}>{t.v}</p>
                <p className={`text-[9px] uppercase tracking-wide ${engaged ? "text-red-400/70" : "text-ink-faint"}`}>{t.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* distributed trace waterfall */}
            <div>
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
                <GitBranch className="w-3.5 h-3.5" /> Distributed traces · latest swarm runs
              </p>
              <div className="space-y-3 max-h-72 overflow-y-auto thin-scroll pr-1">
                {(m?.traces ?? []).length === 0 && (
                  <p className={`text-xs py-6 text-center ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>No traces yet — run the agent swarm in the Command Center.</p>
                )}
                {(m?.traces ?? []).map((tr) => (
                  <div key={tr.id} className={`rounded-xl border p-3 ${engaged ? "bg-white/5 border-red-900/40" : "bg-bg border-line"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-mono text-[10px] ${engaged ? "text-red-300" : "text-sbi"}`}>{tr.id} · {tr.route}</span>
                      <span className={`text-[10px] font-bold ${engaged ? "text-red-200" : "text-navy"}`}>{(tr.totalMs / 1000).toFixed(2)}s</span>
                    </div>
                    {tr.spans.map((sp) => (
                      <div key={sp.name} className="mb-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={engaged ? "text-red-200/80" : "text-ink-soft"}>{sp.name}</span>
                          <span className={engaged ? "text-red-400/70" : "text-ink-faint"}>{sp.durMs}ms{sp.note ? ` · ${sp.note}` : ""}</span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${engaged ? "bg-white/10" : "bg-line"}`}>
                          <div
                            className={`h-full rounded-full ${sp.status === "ok" ? "bg-gradient-to-r from-sbi to-cyan" : "bg-red-500"}`}
                            style={{ marginLeft: `${Math.min(90, (sp.startMs / Math.max(1, tr.totalMs)) * 100)}%`, width: `${Math.max(2, (sp.durMs / Math.max(1, tr.totalMs)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* audit event stream */}
            <div>
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
                <Radio className="w-3.5 h-3.5" /> Ops audit stream · append-only
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto thin-scroll pr-1">
                <AnimatePresence initial={false}>
                  {(m?.events ?? []).map((e) => (
                    <motion.div
                      key={e.seq}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] border ${
                        e.severity === "critical"
                          ? "bg-red-500/10 border-red-500/40 text-red-500"
                          : e.severity === "warn"
                            ? engaged ? "bg-amber-500/10 border-amber-700/40 text-amber-300" : "bg-warm/10 border-warm/30 text-warm"
                            : engaged ? "bg-white/5 border-red-900/30 text-red-200/70" : "bg-bg border-line text-ink-soft"
                      }`}
                    >
                      <span className="font-mono shrink-0 opacity-60">#{e.seq}</span>
                      <span className="min-w-0">{e.action}</span>
                      <span className="ml-auto shrink-0 opacity-50 font-mono">{new Date(e.at).toLocaleTimeString("en-IN", { hour12: false })}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ GOVERNANCE — data plane + maker-checker ═══ */}
        <section className={`rounded-3xl border card-elevate p-6 xl:col-span-2 ${engaged ? "bg-[#20100e] border-red-900/40" : "bg-surface border-line"}`}>
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <Database className="w-4 h-4" /> Data plane — inbound from SBI core · lineage & minimisation
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { k: "Source", v: "Bank-owned APIs only" },
              { k: "Identifiers", v: "Masked · last 4 digits" },
              { k: "Persistence", v: "No durable store · in-memory only" },
            ].map((x) => (
              <div key={x.k} className={`rounded-xl p-2.5 border text-center ${engaged ? "bg-white/5 border-red-900/30" : "bg-bg border-line"}`}>
                <p className={`text-[9px] uppercase tracking-wide ${engaged ? "text-red-400/70" : "text-ink-faint"}`}>{x.k}</p>
                <p className={`text-[11px] font-bold ${engaged ? "text-red-100" : "text-navy"}`}>{x.v}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto thin-scroll pr-1">
            {(m?.dataEvents ?? []).length === 0 && (
              <p className={`text-xs py-6 text-center ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>No pulls yet — open the Command Center to assemble the live roster.</p>
            )}
            {(m?.dataEvents ?? []).map((e) => (
              <div key={e.seq} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] border ${engaged ? "bg-white/5 border-red-900/30 text-red-200/80" : "bg-bg border-line text-ink-soft"}`}>
                <span className={`font-mono font-bold shrink-0 ${engaged ? "text-red-300" : "text-sbi"}`}>{e.api}</span>
                <span className="font-mono shrink-0">a/c {e.account}</span>
                <span className="shrink-0">{e.fields} fields</span>
                <span className={`ml-auto shrink-0 ${engaged ? "text-red-400/70" : "text-ink-faint"}`}>{e.ms}ms · {new Date(e.at).toLocaleTimeString("en-IN", { hour12: false })}</span>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-[10px] leading-relaxed ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>
            Every inbound pull is logged with API, masked account and field count — DPDP data-minimisation and purpose-limitation, auditable in real time.
          </p>
        </section>

        <section className={`rounded-3xl border card-elevate p-6 xl:col-span-1 ${engaged ? "bg-[#20100e] border-red-900/40" : "bg-surface border-line"}`}>
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <ShieldCheck className="w-4 h-4" /> Action approvals — maker-checker
          </p>
          <div className="space-y-2 max-h-[340px] overflow-y-auto thin-scroll pr-1">
            {(m?.actions ?? []).length === 0 && (
              <p className={`text-xs py-6 text-center ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>No proposals yet — run the swarm and propose an action in the Command Center.</p>
            )}
            {(m?.actions ?? []).map((a) => (
              <div key={a.id} className={`rounded-xl border p-3 ${engaged ? "bg-white/5 border-red-900/40" : "bg-bg border-line"}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${
                    a.status === "pending" ? "text-warm bg-warm/10" : a.status === "executed" ? "text-teal bg-teal/10" : a.status === "rejected" ? "text-red-500 bg-red-500/10" : "text-ink-faint bg-bg"
                  }`}>{a.status}</span>
                  <span className={`font-mono text-[10px] ${engaged ? "text-red-300" : "text-ink-faint"}`}>{a.id}</span>
                </div>
                <p className={`text-xs font-bold mt-1.5 ${engaged ? "text-red-100" : "text-navy"}`}>{a.summary}</p>
                <p className={`text-[10px] mt-0.5 ${engaged ? "text-red-300/70" : "text-ink-soft"}`}>{a.customer} · a/c {a.account || "—"}</p>
                {a.status === "pending" && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => decide(a.id, "approve")}
                      disabled={decideBusy === a.id}
                      className="flex-1 rounded-lg bg-teal text-white text-[11px] font-bold py-2 hover:brightness-110 transition-all disabled:opacity-60"
                    >
                      {decideBusy === a.id ? "Executing…" : "Approve & execute"}
                    </button>
                    <button
                      onClick={() => decide(a.id, "reject")}
                      disabled={decideBusy === a.id}
                      className="flex-1 rounded-lg bg-red-500/15 text-red-600 text-[11px] font-bold py-2 hover:bg-red-500/25 transition-all disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {a.status === "executed" && a.result && (
                  <p className="text-[10px] font-mono text-teal mt-1.5">✓ opened on SBI core · a/c {a.result}</p>
                )}
                {a.decidedBy && <p className={`text-[9px] mt-1 ${engaged ? "text-red-400/60" : "text-ink-faint"}`}>{a.decidedBy}</p>}
              </div>
            ))}
          </div>
          <p className={`mt-2 text-[10px] leading-relaxed ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>
            Agents can only PROPOSE. A named officer approves before the core is touched — RBI IT-Governance dual control, and the kill switch freezes this queue too.
          </p>
        </section>

        {/* ═══ SECURITY ═══ */}
        <section className={`rounded-3xl border card-elevate p-6 xl:col-span-2 ${engaged ? "bg-[#20100e] border-red-900/40" : "bg-surface border-line"}`}>
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <ShieldCheck className="w-4 h-4" /> Security — secure by design
          </p>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* live header check */}
            <div>
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
                <Lock className="w-3.5 h-3.5" /> HTTP security headers · verified live in this browser
              </p>
              <div className="space-y-1.5">
                {HEADo.map((h) => {
                  const ok = Boolean(headers?.[h]);
                  return (
                    <div key={h} className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-[11px] ${engaged ? "bg-white/5 border-red-900/30" : "bg-bg border-line"}`}>
                      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-teal shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <span className={`font-mono ${engaged ? "text-red-200/80" : "text-navy"}`}>{h}</span>
                      <span className={`ml-auto truncate max-w-[45%] ${engaged ? "text-red-300/50" : "text-ink-faint"}`}>{headers?.[h]?.slice(0, 42) ?? "missing"}</span>
                    </div>
                  );
                })}
              </div>

              {/* VAPT + automated testing — production roadmap, honestly labelled */}
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mt-4 mb-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>Security testing · production roadmap</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "SAST on every commit", v: "CodeQL — planned" },
                  { k: "Dependency audit", v: "npm audit — CI-gated" },
                  { k: "DAST (staging)", v: "OWASP ZAP — planned" },
                  { k: "External VAPT", v: "CERT-In — pre-prod gate" },
                ].map((x) => (
                  <div key={x.k} className={`rounded-xl p-3 border ${engaged ? "bg-white/5 border-red-900/30" : "bg-bg border-line"}`}>
                    <p className={`text-[11px] font-bold ${engaged ? "text-red-100" : "text-navy"}`}>{x.k}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${engaged ? "text-red-300/70" : "text-ink-faint"}`}>◦ {x.v}</p>
                  </div>
                ))}
              </div>
              <p className={`text-[9px] mt-1.5 ${engaged ? "text-red-300/50" : "text-ink-faint"}`}>Roadmap gates for production deployment — not yet run on this prototype.</p>
            </div>

            {/* DPDP live redaction */}
            <div>
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
                <ScanLine className="w-3.5 h-3.5" /> DPDP guard · live PII redaction (Azure AI Language)
              </p>
              <textarea
                value={piiIn}
                onChange={(e) => setPiiIn(e.target.value)}
                rows={3}
                className={`w-full rounded-xl border p-3 text-xs outline-none transition-colors ${engaged ? "bg-white/5 border-red-900/40 text-red-100 focus:border-red-500" : "bg-bg border-line text-ink focus:border-cyan"}`}
              />
              <button
                onClick={runPii}
                disabled={piiBusy}
                className={`mt-2 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold px-4 py-2.5 transition-all disabled:opacity-60 ${engaged ? "bg-red-500/20 text-red-200 hover:bg-red-500/30" : "bg-sbi text-white hover:bg-navy"}`}
              >
                <ScanLine className="w-3.5 h-3.5" /> {piiBusy ? "Scanning…" : "Scan & redact before LLM"}
              </button>
              {piiOut && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-xl border p-3 ${engaged ? "bg-white/5 border-red-900/40" : "bg-bg border-line"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
                    Redacted in {piiOut.ms}ms · {piiOut.entities.length} identifiers — this is what the LLM receives:
                  </p>
                  <p className={`font-mono text-xs leading-relaxed ${engaged ? "text-red-100" : "text-navy"}`}>{piiOut.redactedText}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {piiOut.entities.map((e, i) => (
                      <span key={i} className="text-[10px] font-semibold text-red-500 bg-red-500/10 rounded-full px-2 py-0.5">{e.category}</span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* live SBI InnoHub call */}
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mt-4 mb-2 flex items-center gap-1.5 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
                <Landmark className="w-3.5 h-3.5" /> SBI core banking · live InnoHub sandbox call
              </p>
              <button
                onClick={runSbi}
                disabled={sbiBusy}
                className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-bold px-4 py-2.5 transition-all disabled:opacity-60 ${engaged ? "bg-red-500/20 text-red-200 hover:bg-red-500/30" : "bg-navy text-white hover:bg-sbi"}`}
              >
                <Landmark className="w-3.5 h-3.5" /> {sbiBusy ? "Calling api.innohub.sbi…" : "Fetch live balance (Account Balance API)"}
              </button>
              {sbiOut && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-xl border p-3 ${engaged ? "bg-white/5 border-red-900/40" : "bg-bg border-line"}`}>
                  {sbiOut.live && sbiOut.data ? (
                    <>
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${engaged ? "text-red-400" : "text-teal"}`}>
                        LIVE from api.innohub.sbi in {sbiOut.ms}ms
                      </p>
                      <p className={`font-display text-2xl font-semibold ${engaged ? "text-red-100" : "text-navy"}`}>₹ {Number(sbiOut.data.availBalance).toLocaleString("en-IN")}</p>
                      <p className={`text-[10px] font-mono mt-1 ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>
                        a/c {sbiOut.data.corporateAccountNumber} · ref {sbiOut.data.aPIResRefNo}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-red-500">{sbiOut.error ?? "sandbox unavailable"}</p>
                  )}
                </motion.div>
              )}
              <p className={`mt-2 text-[10px] leading-relaxed ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>
                Every twin snapshot passes the DPDP guard before any model call. SBI data flows over the bank&apos;s own InnoHub APIs. Keys live server-side only; TLS in transit. No durable datastore in this prototype — twins are built per request and held in memory only (AES-256 at rest applies to the production architecture).
              </p>
            </div>
          </div>
        </section>

        {/* ═══ SCALABILITY ═══ */}
        <section className={`rounded-3xl border card-elevate p-6 xl:col-span-1 ${engaged ? "bg-[#20100e] border-red-900/40" : "bg-surface border-line"}`}>
          <p className={`text-[11px] font-bold tracking-[0.25em] uppercase mb-4 flex items-center gap-2 ${engaged ? "text-red-400" : "text-ink-faint"}`}>
            <Layers className="w-4 h-4" /> {"Scalability & capacity"}
          </p>

          {/* architecture strip */}
          <div className="space-y-2 mb-4">
            {[
              { Icon: Server, t: "Stateless swarm workers", d: "horizontal autoscale · K8s HPA on queue depth" },
              { Icon: Database, t: "Twin store, 50 crore customers", d: "sharded by CIF · episodic + semantic memory tiers" },
              { Icon: Cpu, t: "Queue-buffered LLM tier", d: "token-bucket rate control · burst-safe engagement windows" },
              { Icon: GitBranch, t: "Channel fan-out", d: "YONO · WhatsApp/RCS · SMS · branch RM co-pilot" },
            ].map((a) => (
              <div key={a.t} className={`flex gap-3 rounded-xl p-3 border ${engaged ? "bg-white/5 border-red-900/30" : "bg-bg border-line"}`}>
                <a.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${engaged ? "text-red-300" : "text-cyan"}`} />
                <div>
                  <p className={`text-xs font-bold ${engaged ? "text-red-100" : "text-navy"}`}>{a.t}</p>
                  <p className={`text-[10px] ${engaged ? "text-red-300/60" : "text-ink-soft"}`}>{a.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* capacity table */}
          <div className={`rounded-xl border overflow-hidden mb-4 ${engaged ? "border-red-900/40" : "border-line"}`}>
            {[
              ["Twin updates/day (sustained)", "120M+"],
              ["Concurrent engagement journeys", "250,000"],
              ["Swarm run p95 target", "< 20s"],
              ["Signal ingest p95", "< 150ms"],
            ].map(([k, v], i) => (
              <div key={k} className={`flex justify-between px-3 py-2 text-[11px] ${i % 2 ? "" : engaged ? "bg-white/5" : "bg-bg"}`}>
                <span className={engaged ? "text-red-200/80" : "text-ink-soft"}>{k}</span>
                <span className={`font-bold ${engaged ? "text-red-100" : "text-navy"}`}>{v}</span>
              </div>
            ))}
          </div>

          {/* live load test */}
          <button
            onClick={runLoadTest}
            disabled={loadBusy}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold py-3 transition-all disabled:opacity-60 ${engaged ? "bg-red-500/20 text-red-200 hover:bg-red-500/30" : "bg-navy text-white hover:bg-sbi"}`}
          >
            <Play className="w-4 h-4" /> {loadBusy ? "Firing 60 concurrent requests…" : "Run live load test (60 concurrent)"}
          </button>
          {loadResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-2 mt-3">
              {[
                ["p50", `${loadResult.p50}ms`],
                ["p95", `${loadResult.p95}ms`],
                ["max", `${loadResult.max}ms`],
                ["throughput", `${loadResult.rps}/s`],
              ].map(([k, v]) => (
                <div key={k} className={`rounded-xl border px-2 py-2.5 text-center ${engaged ? "bg-white/5 border-red-900/30" : "bg-bg border-line"}`}>
                  <p className={`font-display text-base font-semibold ${engaged ? "text-red-100" : "text-navy"}`}>{v}</p>
                  <p className={`text-[9px] uppercase tracking-wide ${engaged ? "text-red-400/70" : "text-ink-faint"}`}>{k}</p>
                </div>
              ))}
            </motion.div>
          )}
          <p className={`mt-2 text-[10px] ${engaged ? "text-red-300/60" : "text-ink-faint"}`}>Real requests against this running instance — measured in your browser, no mock numbers.</p>
        </section>
      </div>

      <p className={`text-center text-[11px] pb-6 ${engaged ? "text-red-400/60" : "text-ink-faint"}`}>
        AURA Platform Operations · kill switch, traces, audit stream, header checks, PII redaction, load tests and SBI API calls are all live · Team Kellton
      </p>
    </main>
  );
}
