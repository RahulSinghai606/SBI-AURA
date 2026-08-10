"use client";

// SBI AURA — Live Command Center demo
// Pick a synthetic customer → inspect their Digital Twin → run the agent
// swarm (live reasoning via the AURA Reasoning Engine) → review the
// next-best-action → talk to AURA in a WhatsApp-style conversation.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Radio,
  Sparkles,
  ShieldCheck,
  Gift,
  MessageCircle,
  Play,
  Send,
  CheckCheck,
  BadgeCheck,
  AlertCircle,
  Landmark,
  Smartphone,
  Clock,
  Languages,
  Zap,
  Database,
  Activity,
  Target,
  RotateCcw,
} from "lucide-react";
import { customers, Customer, AgentStep, NextBestAction } from "@/lib/data";
import AuraLoader from "@/components/AuraLoader";

type Phase = "idle" | "running" | "revealing" | "done";
type ChatMsg = { role: "customer" | "aura"; text: string };

const STEP_ICONS: Record<string, React.ElementType> = {
  radar: Radio,
  sparkles: Sparkles,
  shield: ShieldCheck,
  gift: Gift,
  message: MessageCircle,
};

const SIGNAL_ICONS: Record<string, React.ElementType> = {
  transaction: Landmark,
  app: Smartphone,
  "life-event": Sparkles,
  bureau: Activity,
  branch: Landmark,
};

export default function DemoPage() {
  const [customer, setCustomer] = useState<Customer>(customers[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [nba, setNba] = useState<NextBestAction | null>(null);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<"signals" | "memory">("signals");

  // chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [lang, setLang] = useState<"en" | "hi" | "gu" | "mr">("en");
  const [killed, setKilled] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // live kill-switch awareness — polled from the ops core
  useEffect(() => {
    let on = true;
    const pollKill = async () => {
      try {
        const r = await fetch("/api/ops/kill", { cache: "no-store" });
        const d = await r.json();
        if (on) setKilled(Boolean(d.engaged));
      } catch {}
    };
    pollKill();
    const t = setInterval(pollKill, 3000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, []);

  // Azure Neural TTS — reads AURA's latest message aloud in the selected language
  const speak = async (text: string) => {
    if (!text || speaking) return;
    setSpeaking(true);
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        const audio = new Audio(url);
        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => setSpeaking(false);
        await audio.play();
        return;
      }
    } catch {}
    setSpeaking(false);
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [liveLoading, setLiveLoading] = useState(false);

  // pull the LIVE twin — every field assembled from SBI core-banking APIs
  const loadLiveTwin = async () => {
    if (liveLoading) return;
    setLiveLoading(true);
    try {
      const r = await fetch("/api/sbi/twin", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (r.status === 423) {
        setKilled(true);
        setLiveLoading(false);
        return;
      }
      const d = await r.json();
      if (d.customer) selectCustomer(d.customer as Customer);
    } catch {}
    setLiveLoading(false);
  };

  const selectCustomer = (c: Customer) => {
    setCustomer(c);
    setPhase("idle");
    setSteps([]);
    setVisibleSteps(0);
    setNba(null);
    setChatOpen(false);
    setMessages([]);
    setExecResult(null);
    setTab("signals");
  };

  const runSwarm = async () => {
    setPhase("running");
    setSteps([]);
    setVisibleSteps(0);
    setNba(null);
    setChatOpen(false);
    setMessages([]);
    setExecResult(null);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      });
      if (res.status === 423) {
        setPhase("idle");
        setKilled(true);
        return;
      }
      const data = await res.json();
      setSteps(data.steps);
      setNba(data.nba);
      setLive(data.live);
    } catch {
      setSteps(customer.fallback.steps);
      setNba(customer.fallback.nba);
      setLive(false);
    }
    setPhase("revealing");
  };

  // staggered reveal of agent findings
  useEffect(() => {
    if (phase !== "revealing") return;
    if (visibleSteps >= steps.length) {
      const t = setTimeout(() => setPhase("done"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleSteps((v) => v + 1), 850);
    return () => clearTimeout(t);
  }, [phase, visibleSteps, steps.length]);

  const [execBusy, setExecBusy] = useState(false);
  const [execResult, setExecResult] = useState<string | null>(null);

  // execute the approved NBA for real on the SBI core (Account Creation API)
  const executeNba = async () => {
    if (execBusy || execResult) return;
    setExecBusy(true);
    try {
      const r = await fetch("/api/sbi/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (r.status === 423) {
        setKilled(true);
        setExecBusy(false);
        return;
      }
      const d = await r.json();
      if (d.live && d.accountNumber) setExecResult(d.accountNumber);
    } catch {}
    setExecBusy(false);
  };

  const openChat = () => {
    setChatOpen(true);
    setMessages([{ role: "aura", text: nba?.message ?? customer.fallback.chatOpener }]);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || typing) return;
    const next: ChatMsg[] = [...messages, { role: "customer", text }];
    setMessages(next);
    setDraft("");
    setTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, messages: next, lang }),
      });
      if (res.status === 423) {
        setKilled(true);
        setMessages((m) => [...m, { role: "aura", text: "Engagement is paused by the bank right now — a human officer will pick this up shortly." }]);
        setTyping(false);
        return;
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "aura", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "aura", text: "I'll get back to you in a moment — meanwhile your relationship manager has been notified. 😊" }]);
    }
    setTyping(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, chatOpen]);

  return (
    <main className="min-h-screen aurora-bg noise">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-bg transition-colors" aria-label="Back to home">
              <ArrowLeft className="w-4 h-4 text-ink-soft" />
            </Link>
            <Image src="/kellton-logo.jpg" alt="Kellton" width={84} height={24} className="h-5 w-auto rounded" />
            <span className="h-5 w-px bg-line" />
            <span className="font-display font-bold text-navy">
              AURA <span className="text-gradient">Command Center</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 rounded-lg bg-bg border border-line p-0.5" aria-label="Conversation language">
              {(["en", "hi", "gu", "mr"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide transition-colors ${
                    lang === l ? "bg-sbi text-white" : "text-ink-faint hover:text-navy"
                  }`}
                >
                  {l === "en" ? "EN" : l === "hi" ? "हिं" : l === "gu" ? "ગુ" : "मरा"}
                </button>
              ))}
            </div>
            <Link
              href="/ops"
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy border border-line rounded-full px-3 py-1 hover:border-cyan hover:text-sbi transition-colors"
            >
              Ops Console
            </Link>
            {killed ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-red-600 bg-red-500/10 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                ENGAGEMENT SUSPENDED
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-teal bg-teal/10 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                REASONING ENGINE ONLINE
              </span>
            )}
            <Image src="/sbi-logo.webp" alt="SBI" width={26} height={26} className="h-6 w-auto" />
          </div>
        </div>
      </header>

      {/* platform-wide kill banner */}
      {killed && (
        <div className="bg-red-600 text-white text-[12px] font-semibold py-2 px-4 flex items-center justify-center gap-2 flex-wrap">
          KILL SWITCH ENGAGED — all agentic engagement is suspended platform-wide. No customer is contacted while the switch is on.
          <Link href="/ops" className="underline underline-offset-2 font-bold">
            Release from the Ops Console →
          </Link>
        </div>
      )}

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[300px_1fr_1.1fr] gap-5">
        {/* ── LEFT: customer roster ── */}
        <aside className="space-y-3">
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-ink-faint px-1">Customer Digital Twins</p>
          {customers.map((c) => {
            const active = c.id === customer.id;
            return (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className={`w-full text-left rounded-2xl p-4 transition-all border ${
                  active ? "bg-surface border-cyan card-elevate -translate-y-0.5" : "glass border-transparent hover:border-line hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, hsl(${c.avatarHue} 70% 45%), hsl(${c.avatarHue + 40} 75% 55%))` }}
                  >
                    {c.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy truncate">{c.name}</p>
                    <p className="text-xs text-ink-soft truncate">{c.segment} · {c.location.split(",")[0]}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-sbi bg-sbi/8 rounded-full px-2 py-0.5">{c.signals.filter((s) => s.strength === "high").length} hot signals</span>
                  <span className="text-[10px] text-ink-faint">{c.relationshipYears}y relationship</span>
                </div>
              </button>
            );
          })}
          {/* LIVE twin — assembled at runtime from SBI core-banking APIs */}
          <button
            onClick={loadLiveTwin}
            disabled={liveLoading}
            className={`w-full text-left rounded-2xl p-4 transition-all border ${
              customer.id === "live-sbi"
                ? "bg-surface border-teal card-elevate -translate-y-0.5"
                : "glass border-teal/40 hover:border-teal hover:bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-white shrink-0 bg-gradient-to-br from-teal to-cyan">
                {liveLoading ? "…" : "SBI"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-navy truncate">{liveLoading ? "Pulling from SBI core…" : "Live SBI Customer"}</p>
                <p className="text-xs text-ink-soft truncate">Twin built from real core-banking data</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/10 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" /> LIVE · api.innohub.sbi
              </span>
              <span className="text-[10px] text-ink-faint">3 core APIs</span>
            </div>
          </button>
          <div className="rounded-2xl border border-dashed border-line p-4 text-center">
            <p className="text-xs text-ink-faint leading-relaxed">+ 51,99,99,996 more Twins<br />in production rollout</p>
          </div>
        </aside>

        {/* ── MIDDLE: Digital Twin ── */}
        <section className="rounded-3xl bg-surface border border-line card-elevate overflow-hidden flex flex-col">
          <div className="bg-gradient-to-br from-sbi to-navy text-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-xl text-white pulse-ring relative"
                  style={{ background: `linear-gradient(135deg, hsl(${customer.avatarHue} 70% 45%), hsl(${customer.avatarHue + 40} 75% 55%))` }}
                >
                  {customer.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">{customer.name}</h2>
                  <p className="text-sm text-white/70">
                    {customer.age} · {customer.segment} · {customer.location}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase bg-white/15 rounded-full px-3 py-1 shrink-0">Digital Twin</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/10 py-2">
                <p className="font-display font-bold">{customer.balance}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wide">Balance</p>
              </div>
              <div className="rounded-xl bg-white/10 py-2">
                <p className="font-display font-bold">{customer.products.length}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wide">Products</p>
              </div>
              <div className="rounded-xl bg-white/10 py-2">
                <p className="font-display font-bold">{customer.language.split(" /")[0]}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wide">Language</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col min-h-0">
            <div className="rounded-2xl bg-bg border border-line p-4">
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Twin summary — living model
              </p>
              <p className="text-sm text-ink-soft leading-relaxed">{customer.twinSummary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {customer.goals.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 text-[11px] font-medium text-sbi bg-sbi/8 rounded-full px-2.5 py-1">
                    <Target className="w-3 h-3" /> {g}
                  </span>
                ))}
              </div>
            </div>

            {/* tabs */}
            <div className="mt-5 flex gap-1 rounded-xl bg-bg p-1 w-fit">
              {(["signals", "memory"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t ? "bg-surface text-sbi card-elevate" : "text-ink-faint hover:text-ink-soft"}`}
                >
                  {t === "signals" ? "Live signals" : "Twin memory"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2.5 overflow-y-auto thin-scroll flex-1 min-h-[180px] max-h-[320px] pr-1">
              {tab === "signals"
                ? customer.signals.map((s) => {
                    const Icon = SIGNAL_ICONS[s.type] ?? Activity;
                    return (
                      <div key={s.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                        <span className={`mt-0.5 p-1.5 rounded-lg ${s.strength === "high" ? "bg-cyan/12 text-cyan" : "bg-bg text-ink-faint"}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-navy truncate">{s.label}</p>
                            <span className="text-[10px] text-ink-faint shrink-0">{s.time}</span>
                          </div>
                          <p className="text-xs text-ink-soft leading-snug mt-0.5">{s.detail}</p>
                        </div>
                        {s.strength === "high" && <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-warm animate-pulse" />}
                      </div>
                    );
                  })
                : customer.memory.map((m) => (
                    <div key={m.id} className="rounded-xl border border-line bg-surface p-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${m.kind === "episodic" ? "text-cyan" : "text-teal"}`}>
                          {m.kind}
                        </span>
                        <span className="text-[10px] text-ink-faint">{m.time}</span>
                      </div>
                      <p className="text-xs text-ink-soft leading-relaxed mt-1">{m.text}</p>
                    </div>
                  ))}
            </div>

            <button
              onClick={runSwarm}
              disabled={phase === "running" || phase === "revealing" || killed}
              className={`mt-5 group w-full inline-flex items-center justify-center gap-2 rounded-2xl font-semibold py-4 card-elevate transition-all disabled:cursor-not-allowed ${
                killed ? "bg-red-500/15 text-red-600 border border-red-400/50" : "bg-sbi text-white hover:bg-navy disabled:opacity-60"
              }`}
            >
              {killed ? (
                <>Engagement suspended — kill switch engaged</>
              ) : phase === "idle" || phase === "done" ? (
                <>
                  {phase === "done" ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {phase === "done" ? "Re-run agent swarm" : "Run AURA agent swarm"}
                  <Zap className="w-4 h-4 text-cyan group-hover:scale-125 transition-transform" />
                </>
              ) : (
                <>Agents reasoning…</>
              )}
            </button>
          </div>
        </section>

        {/* ── RIGHT: swarm output / chat ── */}
        <section className="rounded-3xl bg-surface border border-line card-elevate overflow-hidden flex flex-col min-h-[640px]">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sbi to-cyan flex items-center justify-center card-elevate mb-6 animate-float">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold text-navy">The swarm is standing by</h3>
                <p className="mt-3 text-sm text-ink-soft max-w-sm leading-relaxed">
                  Run the agent swarm on <strong className="text-navy">{customer.name.split(" ")[0]}&apos;s</strong> Digital Twin.
                  Five agents will sense, infer, check compliance, pick the next-best-action and draft the conversation — live.
                </p>
              </motion.div>
            )}

            {phase === "running" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
                <AuraLoader label={`Analysing ${customer.name.split(" ")[0]}'s twin`} />
              </motion.div>
            )}

            {(phase === "revealing" || phase === "done") && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
                {!chatOpen ? (
                  <div className="flex-1 overflow-y-auto thin-scroll p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-ink-faint">Agent swarm trace</p>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 ${live ? "text-teal bg-teal/10" : "text-warm bg-warm/10"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-teal" : "bg-warm"} animate-pulse`} />
                        {live ? "LIVE REASONING" : "CACHED TWIN SNAPSHOT"}
                      </span>
                    </div>

                    {steps.slice(0, visibleSteps).map((s, i) => {
                      const Icon = STEP_ICONS[s.icon] ?? Sparkles;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className="flex gap-3 rounded-2xl border border-line bg-bg p-4"
                        >
                          <span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-sbi to-cyan text-white flex items-center justify-center">
                            <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-navy">{s.agent}</p>
                              <span className="text-[10px] font-semibold text-cyan">{Math.round(s.confidence * 100)}% confident</span>
                            </div>
                            <p className="text-xs text-ink-soft leading-relaxed mt-1">{s.finding}</p>
                          </div>
                        </motion.div>
                      );
                    })}

                    {phase === "revealing" && visibleSteps < steps.length && (
                      <div className="flex items-center gap-2 px-4 py-3 text-xs text-ink-faint">
                        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan inline-block" />
                        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan inline-block" />
                        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan inline-block" />
                        next agent thinking…
                      </div>
                    )}

                    {phase === "done" && nba && (
                      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="rounded-2xl overflow-hidden border border-cyan/40 card-elevate">
                        <div className="bg-gradient-to-r from-sbi to-cyan text-white px-5 py-3.5 flex items-center justify-between">
                          <p className="font-display font-bold flex items-center gap-2">
                            <BadgeCheck className="w-5 h-5" /> Next-Best-Action
                          </p>
                          <span className="text-[10px] font-bold tracking-[0.15em] uppercase bg-white/20 rounded-full px-2.5 py-1">1 of 1 · no blast</span>
                        </div>
                        <div className="p-5 bg-surface space-y-4">
                          <div>
                            <p className="font-bold text-navy">{nba.action}</p>
                            <p className="text-sm text-sbi font-semibold mt-0.5">{nba.product}</p>
                            <p className="text-xs text-ink-soft leading-relaxed mt-2">{nba.rationale}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-bg py-2 px-1">
                              <Smartphone className="w-4 h-4 text-cyan mx-auto mb-1" />
                              <p className="text-[11px] font-semibold text-navy leading-tight">{nba.channel}</p>
                            </div>
                            <div className="rounded-xl bg-bg py-2 px-1">
                              <Clock className="w-4 h-4 text-cyan mx-auto mb-1" />
                              <p className="text-[11px] font-semibold text-navy leading-tight">{nba.timing}</p>
                            </div>
                            <div className="rounded-xl bg-bg py-2 px-1">
                              <Languages className="w-4 h-4 text-cyan mx-auto mb-1" />
                              <p className="text-[11px] font-semibold text-navy leading-tight">{nba.language}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-line bg-bg p-3.5 space-y-1.5">
                            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink-faint mb-2">Compliance guardrails · Decision Engine</p>
                            {nba.compliance.map((c) => (
                              <div key={c.rule} className="flex items-center gap-2">
                                {c.status === "pass" ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-teal shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-warm shrink-0" />
                                )}
                                <p className="text-xs text-ink-soft">{c.rule}</p>
                                <span className={`ml-auto text-[9px] font-bold uppercase tracking-wider ${c.status === "pass" ? "text-teal" : "text-warm"}`}>
                                  {c.status === "pass" ? "pass" : "human review"}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={openChat}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal text-white font-semibold py-3.5 hover:brightness-110 transition-all card-elevate"
                          >
                            <MessageCircle className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                            Deliver via {nba.channel.split(" ")[0]} — open conversation
                          </button>
                          <button
                            onClick={executeNba}
                            disabled={execBusy || Boolean(execResult)}
                            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold py-3.5 transition-all card-elevate disabled:cursor-not-allowed ${
                              execResult ? "bg-teal/10 text-teal border border-teal/40" : "bg-navy text-white hover:bg-sbi disabled:opacity-70"
                            }`}
                          >
                            {execResult
                              ? `✓ OPENED on SBI core · a/c ${execResult}`
                              : execBusy
                                ? "Calling SBI Account Creation API…"
                                : "Execute on SBI core — open deposit account (live)"}
                          </button>
                          {execResult && (
                            <p className="text-[10px] text-ink-faint text-center">
                              Real account number returned by api.innohub.sbi · action recorded on the ops audit stream
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  /* ── WhatsApp-style conversation ── */
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-5 py-3.5 bg-gradient-to-r from-teal to-cyan text-white flex items-center gap-3">
                      <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg hover:bg-white/15 transition-colors" aria-label="Back to swarm trace">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-display font-bold">A</div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">AURA · SBI</p>
                        <p className="text-[11px] text-white/75">
                          {typing ? "typing…" : `${customer.name.split(" ")[0]}'s relationship assistant`}
                        </p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold tracking-wider bg-white/20 rounded-full px-2.5 py-1 uppercase">{nba?.channel.split(" ")[0] ?? "WhatsApp"}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto thin-scroll px-4 py-5 space-y-3 bg-[#eef4f9]">
                      <p className="text-center text-[10px] text-ink-faint">
                        Simulated customer conversation · you are replying as {customer.name}
                      </p>
                      {messages.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${m.role === "customer" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap card-elevate ${
                              m.role === "customer" ? "bg-sbi text-white rounded-br-md" : "bg-surface text-ink rounded-bl-md"
                            }`}
                          >
                            {m.text}
                            {m.role === "aura" && (
                              <span className="flex items-center justify-between gap-2 mt-1">
                                <button
                                  onClick={() => speak(m.text)}
                                  disabled={speaking}
                                  className={`inline-flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5 transition-colors ${
                                    speaking ? "bg-cyan/15 text-cyan animate-pulse" : "bg-sbi/8 text-sbi hover:bg-sbi hover:text-white"
                                  }`}
                                  aria-label="Listen"
                                >
                                  🔊 {speaking ? "Speaking…" : "Listen"}
                                </button>
                                <span className="text-[9px] text-ink-faint">AURA · compliant · human-override on</span>
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {typing && (
                        <div className="flex justify-start">
                          <div className="bg-surface rounded-2xl rounded-bl-md px-4 py-3 card-elevate flex gap-1.5">
                            <span className="typing-dot w-2 h-2 rounded-full bg-cyan inline-block" />
                            <span className="typing-dot w-2 h-2 rounded-full bg-cyan inline-block" />
                            <span className="typing-dot w-2 h-2 rounded-full bg-cyan inline-block" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-3.5 bg-surface border-t border-line flex items-center gap-2">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={`Reply as ${customer.name.split(" ")[0]}…`}
                        className="flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-cyan transition-colors"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={typing || !draft.trim()}
                        className="p-3 rounded-xl bg-sbi text-white hover:bg-navy transition-colors disabled:opacity-50"
                        aria-label="Send"
                      >
                        <Send className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <p className="text-center text-[11px] text-ink-faint pb-6">
        SBI AURA concept demo · all customers &amp; data synthetic · SBI × Kellton, accelerated on KAI
      </p>
    </main>
  );
}
