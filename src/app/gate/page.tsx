"use client";

// Access gate — AURA-styled password screen. Private demo, keeps scrapers out.

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function Gate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen aurora-bg noise flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl bg-surface border border-line card-elevate p-8 text-center"
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <Image src="/kellton-logo.jpg" alt="Kellton" width={96} height={26} className="h-6 w-auto rounded" />
          <span className="h-5 w-px bg-line" />
          <Image src="/sbi-logo.webp" alt="SBI" width={28} height={28} className="h-7 w-auto" />
        </div>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sbi to-cyan flex items-center justify-center card-elevate mb-5 pulse-ring relative">
          <Lock className="w-7 h-7 text-white" />
        </div>

        <h1 className="font-display text-2xl font-bold text-navy">
          SBI <span className="text-gradient">AURA</span> · Private demo
        </h1>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          This preview is access-controlled. Enter the passphrase shared by Team Kellton.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Passphrase"
            autoFocus
            className={`flex-1 h-12 px-4 rounded-xl border bg-bg text-sm outline-none transition-colors ${error ? "border-red-400" : "border-line focus:border-cyan"}`}
          />
          <button
            onClick={submit}
            disabled={busy || !password}
            className="h-12 px-5 rounded-xl bg-sbi text-white font-semibold inline-flex items-center gap-1.5 hover:bg-navy transition-colors disabled:opacity-50"
          >
            {busy ? "…" : <>Enter <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-3">Incorrect passphrase — try again.</p>}

        <p className="mt-6 text-[11px] text-ink-faint flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> No indexing · no scraping · synthetic data only
        </p>
      </motion.div>
    </main>
  );
}
