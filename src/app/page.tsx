"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Radio,
  Sparkles,
  ShieldCheck,
  Gift,
  MessageCircle,
  RefreshCcw,
  TrendingUp,
  Fingerprint,
  UserMinus,
  SmilePlus,
  Layers,
  Globe2,
  PlayCircle,
} from "lucide-react";
import Nav from "@/components/Nav";
import AuroraCanvas from "@/components/AuroraCanvas";
import CardSwap, { Card } from "@/components/CardSwap";
import ExplodedView from "@/components/ExplodedView";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

const AGENT_CARDS = [
  { name: "Sensor Agent", Icon: Radio, tint: "from-sbi to-cyan", desc: "Streams every transaction, YONO tap, bureau refresh and branch note into the Twin — in real time.", metric: "1.2M signals/min" },
  { name: "Life-Event Agent", Icon: Sparkles, tint: "from-cyan to-teal", desc: "Correlates patterns into life moments: a first home, a daughter's admission, a business scaling up.", metric: "91% event precision" },
  { name: "Risk & Compliance Agent", Icon: ShieldCheck, tint: "from-navy to-sbi", desc: "RBI and DPDP guardrails live inside the loop — consent, suitability and human override on every action.", metric: "100% actions checked" },
  { name: "Offer Agent", Icon: Gift, tint: "from-teal to-cyan", desc: "Selects one next-best-action per customer from the eligible product universe. Never a blast.", metric: "4× conversion" },
  { name: "Conversation Agent", Icon: MessageCircle, tint: "from-cyan to-sbi", desc: "Writes in the customer's language and tone, at the moment they actually read — 22 languages deep.", metric: "22 languages" },
  { name: "Feedback Agent", Icon: RefreshCcw, tint: "from-sbi to-teal", desc: "Every click, ignore or purchase flows back into memory. AURA gets smarter with each interaction.", metric: "continuous loop" },
];

const IMPACT = [
  { Icon: TrendingUp, big: "+15–20%", label: "Revenue uplift", sub: "fee & cross-sell income via next-best-action engagement" },
  { Icon: Fingerprint, big: "+25%", label: "Digital adoption", sub: "push-blasts become personal conversations on YONO" },
  { Icon: UserMinus, big: "–30%", label: "Dormancy & churn", sub: "early life-event and financial-stress detection" },
  { Icon: SmilePlus, big: "+20 pts", label: "NPS lift", sub: "right-time, right-channel, right-language engagement" },
  { Icon: Layers, big: "4×", label: "Cross-sell conversion", sub: "vs. segment-blast campaigns, per agentic-banking benchmarks" },
  { Icon: Globe2, big: "52 Cr", label: "Twins, one platform", sub: "cloud-native, 22 languages, every channel — built for India scale" },
];

const ROADMAP = [
  { phase: "Pilot", window: "0–3 months", text: "10 lakh customers · 3 journeys: dormancy revival, salary credit, FD maturity" },
  { phase: "Scale", window: "3–6 months", text: "Full Digital Twin rollout · WhatsApp + RCS engagement · A/B vs. control" },
  { phase: "Expand", window: "6–12 months", text: "All retail journeys · agent marketplace · RM co-pilot for branches" },
  { phase: "Ecosystem", window: "12+ months", text: "Account Aggregator, ONDC & embedded finance — AURA as India's engagement rail" },
];

const TICKER = [
  "52 crore Digital Twins", "22 Indian languages", "4× cross-sell conversion", "RBI + DPDP compliant by design",
  "YONO · WhatsApp · RCS · Voice · Branch", "Human-in-the-loop always", "Accelerated on Kellton KAI",
];

export default function Home() {
  return (
    <main className="relative">
      <Nav />

      {/* ───────────── HERO ───────────── */}
      <section className="relative min-h-screen aurora-bg noise overflow-hidden flex items-center">
        <AuroraCanvas className="absolute inset-0 w-full h-full" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-center pointer-events-none">
          <div>
            <motion.div {...fadeUp} className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold tracking-wide text-sbi mb-7 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
              GFF 2026 · PILLAR 3 — DIGITAL ENGAGEMENT · AGENTIC AI
            </motion.div>

            <motion.h1
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.08 }}
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight text-navy"
            >
              Banking that
              <br />
              <span className="text-gradient">senses you</span> —
              <br />
              before you ask.
            </motion.h1>

            <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} className="mt-7 max-w-xl text-lg text-ink-soft leading-relaxed">
              <strong className="text-navy">SBI AURA</strong>
              {" gives every one of SBI's 52 crore customers a living "}
              <strong className="text-navy">Customer Digital Twin</strong>
              {" — with a swarm of AI agents that senses life's moments and engages with hyper-personal, compliant conversations. Reactive campaigns become anticipatory relationships."}
            </motion.p>

            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.24 }} className="mt-9 flex flex-wrap gap-4 pointer-events-auto">
              <Link
                href="/demo"
                className="group inline-flex items-center gap-2 rounded-2xl bg-sbi text-white font-semibold px-7 py-4 card-elevate hover:bg-navy transition-all hover:-translate-y-0.5"
              >
                <PlayCircle className="w-5 h-5" />
                Launch the live demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-2xl glass font-semibold text-navy px-7 py-4 hover:bg-white transition-colors"
              >
                See how it works
              </a>
            </motion.div>

            <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="mt-6 text-xs text-ink-faint">
              Move your cursor through the aura · click to shift the palette
            </motion.p>
          </div>

          {/* Twin orbit visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:flex items-center justify-center h-[480px]"
          >
            <div className="absolute w-[420px] h-[420px] rounded-full border border-sbi/10 animate-[spin_40s_linear_infinite]">
              {[0, 90, 180, 270].map((deg) => (
                <span key={deg} className="absolute w-3 h-3 rounded-full bg-cyan card-elevate" style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(210px) translate(-50%,-50%)` }} />
              ))}
            </div>
            <div className="absolute w-[300px] h-[300px] rounded-full border border-cyan/20 animate-[spin_28s_linear_infinite_reverse]">
              {[45, 165, 285].map((deg) => (
                <span key={deg} className="absolute w-2.5 h-2.5 rounded-full bg-sbi" style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(150px) translate(-50%,-50%)` }} />
              ))}
            </div>
            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-sbi to-cyan card-elevate pulse-ring flex items-center justify-center animate-float">
              <div className="text-center text-white">
                <p className="font-display font-bold text-lg leading-tight">Digital<br />Twin</p>
              </div>
            </div>
            <p className="absolute -bottom-2 text-xs text-ink-faint">One Digital Twin per customer · a swarm of agents around it</p>
          </motion.div>
        </div>

        {/* ticker */}
        <div className="absolute bottom-0 inset-x-0 border-t border-line/70 bg-white/60 backdrop-blur-md py-3 overflow-hidden">
          <div className="flex gap-12 whitespace-nowrap animate-ticker w-max">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="text-xs font-semibold tracking-[0.18em] uppercase text-ink-soft flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── PROBLEM → VISION ───────────── */}
      <section className="relative py-28 bg-surface">
        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-8">
          <motion.div {...fadeUp} className="rounded-3xl border border-line bg-bg p-10 card-elevate">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-warm mb-4">The problem</p>
            <h3 className="font-display text-3xl font-bold text-navy leading-snug">
              Banking engagement is reactive.
            </h3>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Mass campaigns convert under 3%. Dormancy is silent. Drop-offs go unseen until it&apos;s too late.
              The largest customer base in world banking is spoken to in segments — not as people.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="rounded-3xl bg-gradient-to-br from-sbi to-navy p-10 text-white card-elevate">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-cyan mb-4">Our vision</p>
            <h3 className="font-display text-3xl font-bold leading-snug">
              Every customer gets a personal AI relationship team.
            </h3>
            <p className="mt-4 text-white/80 leading-relaxed">
              Proactive, contextual, compliant — AURA turns SBI&apos;s scale into intimacy.
              AI that doesn&apos;t wait to be asked: it senses, reasons, and engages at life&apos;s moments that matter.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───────────── EXPLODED VIEW (pinned scroll) ───────────── */}
      <ExplodedView />

      {/* ───────────── AGENT SWARM + CARDSWAP ───────────── */}
      <section id="agents" className="relative py-32 bg-surface overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp}>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-cyan mb-4">The agent swarm</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-navy leading-tight">
              Six specialists.
              <br />
              <span className="text-gradient">One relationship.</span>
            </h2>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-lg">
              Each Digital Twin is surrounded by a swarm of specialised agents — sensing, inferring, checking,
              choosing, conversing and learning. Together they behave like a personal relationship team that
              never sleeps, never forgets, and never breaks a rule.
            </p>
            <ul className="mt-8 space-y-3">
              {["Human-in-the-loop override on every decision", "Compliance embedded, not bolted on", "Learns from every click, ignore and purchase"].map((li) => (
                <li key={li} className="flex items-start gap-3 text-ink-soft">
                  <ShieldCheck className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="relative h-[460px] flex items-center justify-center lg:justify-end lg:pr-16">
            <CardSwap width={370} height={300} cardDistance={44} verticalDistance={48} delay={3600} pauseOnHover skewAmount={4}>
              {AGENT_CARDS.map((a) => (
                <Card key={a.name} className="p-0 overflow-hidden">
                  <div className="h-full w-full flex flex-col">
                    <div className={`bg-gradient-to-br ${a.tint} px-7 py-6 text-white`}>
                      <a.Icon className="w-8 h-8 mb-3" strokeWidth={1.6} />
                      <h3 className="font-display text-xl font-bold">{a.name}</h3>
                    </div>
                    <div className="flex-1 px-7 py-5 flex flex-col justify-between bg-surface">
                      <p className="text-sm text-ink-soft leading-relaxed">{a.desc}</p>
                      <p className="text-xs font-bold tracking-[0.2em] uppercase text-cyan mt-4">{a.metric}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </CardSwap>
          </div>
        </div>
      </section>

      {/* ───────────── IMPACT ───────────── */}
      <section id="impact" className="relative py-32 aurora-bg noise">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-cyan mb-4">Business value</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-navy">
              Impact at <span className="text-gradient">SBI scale</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {IMPACT.map((s, i) => (
              <motion.div
                key={s.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.06 }}
                className="rounded-3xl glass card-elevate p-8 hover:-translate-y-1 transition-transform"
              >
                <s.Icon className="w-7 h-7 text-cyan mb-5" strokeWidth={1.7} />
                <p className="font-display text-4xl font-bold text-navy">{s.big}</p>
                <p className="font-semibold text-sbi mt-1">{s.label}</p>
                <p className="text-sm text-ink-soft mt-2 leading-relaxed">{s.sub}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-10 rounded-2xl bg-navy text-white px-8 py-6 flex flex-col sm:flex-row items-center gap-4 justify-center text-center card-elevate">
            <span className="text-xs font-bold tracking-[0.25em] uppercase text-cyan">Expected impact</span>
            <span className="text-lg font-medium">
              A 1% engagement-led uplift across SBI&apos;s base is worth <strong>thousands of crores every year.</strong>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ───────────── ROADMAP ───────────── */}
      <section className="relative py-32 bg-surface">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-cyan mb-4">Roadmap</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-navy">
              Pilot-ready in <span className="text-gradient">90 days</span>
            </h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-[19px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-sbi via-cyan to-teal md:-translate-x-px" />
            <div className="space-y-12">
              {ROADMAP.map((r, i) => (
                <motion.div key={r.phase} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }} className={`relative flex ${i % 2 ? "md:justify-start" : "md:justify-end"}`}>
                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-surface border-2 border-cyan flex items-center justify-center font-display font-bold text-sbi z-10">
                    {i + 1}
                  </div>
                  <div className={`ml-16 md:ml-0 md:w-[calc(50%-48px)] rounded-2xl border border-line bg-bg p-6 card-elevate`}>
                    <div className="flex items-baseline gap-3 mb-2">
                      <h3 className="font-display text-xl font-bold text-navy">{r.phase}</h3>
                      <span className="text-xs font-semibold text-cyan">{r.window}</span>
                    </div>
                    <p className="text-sm text-ink-soft leading-relaxed">{r.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── CTA + FOOTER ───────────── */}
      <section className="relative py-28 aurora-bg noise">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.h2 {...fadeUp} className="font-display text-4xl md:text-6xl font-bold text-navy leading-tight">
            &ldquo;The future of intelligent banking <span className="text-gradient">begins here.</span>&rdquo;
          </motion.h2>
          <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="mt-5 text-ink-soft text-lg">
            SBI × Kellton · Agentic AI, deployed at the scale of India
          </motion.p>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }} className="mt-10">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-2 rounded-2xl bg-sbi text-white font-semibold px-9 py-5 text-lg card-elevate hover:bg-navy transition-all hover:-translate-y-0.5"
            >
              Experience AURA live
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <footer className="mt-24 border-t border-line/70">
          <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/kellton-logo.jpg" alt="Kellton" width={100} height={28} className="h-6 w-auto rounded" />
              <span className="h-5 w-px bg-line" />
              <Image src="/sbi-logo.webp" alt="SBI" width={28} height={28} className="h-6 w-auto" />
              <span className="font-display font-bold text-navy">SBI AURA</span>
            </div>
            <p className="text-xs text-ink-faint text-center md:text-right max-w-md">
              Concept demo for GFF 2026 · Team Kellton · Accelerated by the KAI Agentic Platform.
              All customer data shown is fully synthetic.
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
