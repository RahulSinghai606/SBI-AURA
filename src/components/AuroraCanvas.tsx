"use client";

// Light-theme adaptation of the "tubes cursor" concept: flowing ribbon
// trails in SBI brand colours that follow the pointer across the hero.
// Custom canvas-2D implementation — no external CDN, deterministic, fast.

import React, { useEffect, useRef } from "react";

const BRAND_PALETTES: string[][] = [
  ["#22409A", "#00B5EF", "#12C2B9"],
  ["#00B5EF", "#5B7FE8", "#12C2B9"],
  ["#1A1F5C", "#00B5EF", "#7CD4F5"],
  ["#12C2B9", "#22409A", "#63E0D6"],
];

type Ribbon = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  phase: number;
  speed: number;
  amp: number;
};

interface AuroraCanvasProps {
  className?: string;
  ribbonCount?: number;
  enableClickInteraction?: boolean;
}

export default function AuroraCanvas({
  className,
  ribbonCount = 5,
  enableClickInteraction = true,
}: AuroraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement!;

    const pointer = { x: 0, y: 0, active: false };
    let t = 0;

    const SEGMENTS = 42;
    let ribbons: Ribbon[] = [];

    const buildRibbons = () => {
      const palette = BRAND_PALETTES[paletteRef.current % BRAND_PALETTES.length];
      ribbons = Array.from({ length: ribbonCount }, (_, i) => ({
        points: Array.from({ length: SEGMENTS }, () => ({ x: w / 2, y: h / 2 })),
        color: palette[i % palette.length],
        width: 10 - i * 1.4,
        phase: (i / ribbonCount) * Math.PI * 2,
        speed: 0.5 + i * 0.12,
        amp: 26 + i * 14,
      }));
    };

    const resize = () => {
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ribbons.length === 0) buildRibbons();
    };

    resize();
    pointer.x = w * 0.72;
    pointer.y = h * 0.42;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onClick = () => {
      if (!enableClickInteraction) return;
      paletteRef.current += 1;
      const palette = BRAND_PALETTES[paletteRef.current % BRAND_PALETTES.length];
      ribbons.forEach((r, i) => (r.color = palette[i % palette.length]));
    };

    parent.addEventListener("pointermove", onMove);
    parent.addEventListener("pointerleave", onLeave);
    parent.addEventListener("click", onClick);
    window.addEventListener("resize", resize);

    const frame = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      // idle drift target when pointer not over the hero
      const idleX = w * 0.5 + Math.cos(t * 0.5) * w * 0.28;
      const idleY = h * 0.45 + Math.sin(t * 0.8) * h * 0.2;
      const tx = pointer.active ? pointer.x : idleX;
      const ty = pointer.active ? pointer.y : idleY;

      for (const r of ribbons) {
        // head chases the target with a per-ribbon orbital offset
        const ox = Math.cos(t * r.speed + r.phase) * r.amp;
        const oy = Math.sin(t * r.speed * 1.3 + r.phase) * r.amp;
        const head = r.points[0];
        head.x += (tx + ox - head.x) * 0.16;
        head.y += (ty + oy - head.y) * 0.16;

        // follow-the-leader chain
        for (let i = 1; i < r.points.length; i++) {
          const p = r.points[i];
          const prev = r.points[i - 1];
          p.x += (prev.x - p.x) * 0.32;
          p.y += (prev.y - p.y) * 0.32;
        }

        // draw tapered smooth ribbon
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 0; i < r.points.length - 2; i++) {
          const p = r.points[i];
          const next = r.points[i + 1];
          const alpha = 0.5 * (1 - i / r.points.length);
          ctx.strokeStyle = hexWithAlpha(r.color, alpha);
          ctx.lineWidth = Math.max(0.5, r.width * (1 - i / r.points.length));
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
          ctx.stroke();
        }

        // glowing head node
        const grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 26);
        grad.addColorStop(0, hexWithAlpha(r.color, 0.35));
        grad.addColorStop(1, hexWithAlpha(r.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
      parent.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
    };
  }, [ribbonCount, enableClickInteraction]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}

function hexWithAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
