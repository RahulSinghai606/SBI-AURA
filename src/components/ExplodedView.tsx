"use client";

// "Exploded View" assembly — a pinned scroll sequence. The AURA engine
// components burst outward from the Digital Twin core, then fly back and
// lock into the final pipeline layout as the user keeps scrolling.

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Radio,
  Database,
  BrainCircuit,
  Scale,
  MessagesSquare,
  Smartphone,
  UserRound,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const PARTS = [
  { key: "signals", label: "Signals", sub: "Txns · app · life events · AA", Icon: Radio, explode: { x: -420, y: -190, r: -14 }, final: { x: -440, y: 210 } },
  { key: "memory", label: "Memory Layer", sub: "Episodic + semantic recall", Icon: Database, explode: { x: -250, y: 230, r: 10 }, final: { x: -264, y: 210 } },
  { key: "reasoning", label: "Reasoning Engine", sub: "Intent & life-event inference", Icon: BrainCircuit, explode: { x: 160, y: -160, r: 6 }, final: { x: -88, y: 210 } },
  { key: "decision", label: "Decision Engine", sub: "RBI / DPDP guardrails", Icon: Scale, explode: { x: 260, y: 235, r: -8 }, final: { x: 88, y: 210 } },
  { key: "engagement", label: "Engagement Engine", sub: "Tone · timing · 22 languages", Icon: MessagesSquare, explode: { x: 430, y: -175, r: 12 }, final: { x: 264, y: 210 } },
  { key: "channels", label: "Channels", sub: "YONO · WhatsApp · voice · branch", Icon: Smartphone, explode: { x: 470, y: 90, r: -6 }, final: { x: 440, y: 210 } },
];

export default function ExplodedView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const chips = gsap.utils.toArray<HTMLElement>(".xp-chip");
      const core = ".xp-core";
      const rail = ".xp-rail";
      const captions = gsap.utils.toArray<HTMLElement>(".xp-caption");

      gsap.set(chips, { x: 0, y: 0, rotate: 0, scale: 0.4, opacity: 0 });
      gsap.set(rail, { scaleX: 0, opacity: 0 });
      gsap.set(captions[1], { opacity: 0, y: 24 });
      gsap.set(captions[2], { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "+=2400",
          scrub: 0.6,
          pin: stageRef.current,
        },
      });

      // Phase 1 — the Twin awakens, components explode outward
      tl.to(core, { scale: 1.08, duration: 0.5 }, 0);
      PARTS.forEach((p, i) => {
        tl.to(
          `.xp-chip-${p.key}`,
          { x: p.explode.x, y: p.explode.y, rotate: p.explode.r, scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" },
          0.15 + i * 0.08
        );
      });
      tl.to(captions[0], { opacity: 0, y: -24, duration: 0.5 }, 1.1);
      tl.to(captions[1], { opacity: 1, y: 0, duration: 0.5 }, 1.35);

      // hold the exploded constellation for a beat
      tl.to({}, { duration: 0.6 });

      // Phase 2 — components fly back and lock into the pipeline
      PARTS.forEach((p, i) => {
        tl.to(
          `.xp-chip-${p.key}`,
          { x: p.final.x, y: p.final.y, rotate: 0, scale: 0.92, duration: 1.2, ease: "back.out(1.4)" },
          2.4 + i * 0.07
        );
      });
      tl.to(core, { scale: 0.85, y: -40, duration: 1 }, 2.5);
      tl.to(rail, { scaleX: 1, opacity: 1, duration: 0.8, ease: "power2.inOut" }, 3.1);
      tl.to(captions[1], { opacity: 0, y: -24, duration: 0.4 }, 3.0);
      tl.to(captions[2], { opacity: 1, y: 0, duration: 0.5 }, 3.3);
      tl.to({}, { duration: 0.5 });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapRef} id="how-it-works" className="relative">
      <div ref={stageRef} className="h-screen overflow-hidden aurora-bg noise relative flex items-center justify-center">
        {/* captions */}
        <div className="absolute top-[13%] left-0 right-0 z-20 text-center px-6 pointer-events-none">
          <div className="relative h-28">
            <div className="xp-caption absolute inset-0">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase text-cyan mb-3">How AURA works</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy">
                One Digital Twin. <span className="text-gradient">Keep scrolling.</span>
              </h2>
            </div>
            <div className="xp-caption absolute inset-0">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase text-cyan mb-3">Exploded view</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy">
                Six engines orbit <span className="text-gradient">every customer</span>
              </h2>
            </div>
            <div className="xp-caption absolute inset-0">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase text-cyan mb-3">Assembled</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy">
                A continuous <span className="text-gradient">learning loop</span>
              </h2>
            </div>
          </div>
        </div>

        {/* stage */}
        <div className="relative w-full max-w-6xl h-[560px] flex items-center justify-center scale-[0.55] sm:scale-75 lg:scale-100">
          {/* orbit rings */}
          <div className="absolute w-[340px] h-[340px] rounded-full border border-cyan/20" />
          <div className="absolute w-[520px] h-[520px] rounded-full border border-sbi/10" />

          {/* Twin core */}
          <div className="xp-core relative z-10 flex flex-col items-center justify-center w-44 h-44 rounded-full bg-gradient-to-br from-sbi to-cyan text-white card-elevate pulse-ring">
            <UserRound className="w-10 h-10 mb-1" strokeWidth={1.6} />
            <span className="font-display text-sm font-bold leading-tight text-center">
              Customer
              <br />
              Digital Twin
            </span>
          </div>

          {/* pipeline rail (revealed at the end) */}
          <div className="xp-rail absolute left-1/2 -translate-x-1/2 top-1/2 mt-[178px] h-[3px] w-[880px] origin-left rounded-full bg-gradient-to-r from-sbi via-cyan to-teal" />

          {/* component chips */}
          {PARTS.map((p) => (
            <div
              key={p.key}
              className={`xp-chip xp-chip-${p.key} absolute z-20 w-40 rounded-xl glass card-elevate px-4 py-3 text-left`}
            >
              <p.Icon className="w-5 h-5 text-cyan mb-1.5" strokeWidth={1.8} />
              <p className="font-display text-[13px] font-bold text-navy leading-tight">{p.label}</p>
              <p className="text-[11px] text-ink-soft leading-snug mt-0.5">{p.sub}</p>
            </div>
          ))}
        </div>

        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.25em] uppercase text-ink-faint">
          scroll to assemble
        </p>
      </div>
    </div>
  );
}
