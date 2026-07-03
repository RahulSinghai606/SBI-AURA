"use client";

// "Hyper-speed" loader adapted from the reference speeder animation,
// re-coloured for the SBI AURA light theme.

export default function AuraLoader({ label = "Agent swarm reasoning" }: { label?: string }) {
  return (
    <div className="aura-loader-stage flex flex-col items-center justify-center w-full h-full min-h-[220px]">
      <div className="longfazers">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="relative w-full h-[110px]">
        <div className="aura-loader">
          <span>
            <span />
            <span />
            <span />
            <span />
          </span>
          <div className="base">
            <span />
            <div className="face" />
          </div>
        </div>
      </div>

      <div className="z-20 text-center space-y-2">
        <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-navy animate-pulse">
          {label}
        </p>
        <div className="w-52 h-1 bg-line rounded-full mx-auto overflow-hidden relative">
          <div className="h-full w-1/3 bg-gradient-to-r from-sbi to-cyan animate-progress" />
        </div>
      </div>
    </div>
  );
}
