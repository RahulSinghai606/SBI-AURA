"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
        <nav className="glass card-elevate rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/kellton-logo.jpg" alt="Kellton" width={92} height={26} className="h-6 w-auto rounded" />
            <span className="hidden sm:block h-5 w-px bg-line" />
            <span className="font-display font-bold text-navy tracking-tight">
              SBI <span className="text-gradient">AURA</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
            <a href="/#how-it-works" className="hover:text-sbi transition-colors">How it works</a>
            <a href="/#agents" className="hover:text-sbi transition-colors">Agent swarm</a>
            <a href="/#impact" className="hover:text-sbi transition-colors">Impact</a>
          </div>

          <div className="flex items-center gap-3">
            <Image src="/sbi-logo.webp" alt="SBI" width={30} height={30} className="h-7 w-auto" />
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sbi text-white text-sm font-semibold px-4 py-2 hover:bg-navy transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Live demo
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
