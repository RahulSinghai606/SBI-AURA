"use client";

// CardSwap — scroll-driven deck (GSAP ScrollTrigger).
// The section pins while the user scrolls: cards first fly into the stack,
// then each scroll step cycles the front card away so EVERY card gets its
// moment in front. Scrolling back up plays the whole sequence in reverse.

import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  ReactElement,
  ReactNode,
  RefObject,
  useEffect,
  useMemo,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface CardSwapProps {
  width?: number | string;
  height?: number | string;
  cardDistance?: number;
  verticalDistance?: number;
  /** CSS selector of the section to pin while the deck cycles (e.g. "#agents") */
  pinTrigger?: string;
  /** Scroll distance (px) the pinned deck sequence occupies */
  scrollLength?: number;
  onCardClick?: (idx: number) => void;
  skewAmount?: number;
  children: ReactNode;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ customClass, ...rest }, ref) => (
  <div
    ref={ref}
    {...rest}
    className={`absolute top-1/2 left-1/2 rounded-2xl border border-line bg-surface card-elevate [transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden] ${customClass ?? ""} ${rest.className ?? ""}`.trim()}
  />
));

Card.displayName = "Card";

type CardRef = RefObject<HTMLDivElement | null>;

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});

export const CardSwap: React.FC<CardSwapProps> = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  pinTrigger,
  scrollLength = 2600,
  onCardClick,
  skewAmount = 6,
  children,
}) => {
  const childArr = useMemo(() => Children.toArray(children) as ReactElement<CardProps>[], [children]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refs = useMemo<CardRef[]>(() => childArr.map(() => React.createRef<HTMLDivElement>()), [childArr.length]);
  const container = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const total = refs.length;
    if (total < 2) return;
    const els = refs.map((r) => r.current).filter(Boolean) as HTMLDivElement[];
    if (els.length !== total) return;
    const slot = (i: number) => makeSlot(i, cardDistance, verticalDistance, total);

    // start hidden below their slots
    els.forEach((el, i) => {
      const s = slot(i);
      gsap.set(el, {
        x: s.x + 140,
        y: s.y + 420,
        z: s.z,
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        rotate: 8,
        skewY: skewAmount,
        transformOrigin: "center center",
        zIndex: s.zIndex,
        force3D: true,
      });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinTrigger ?? container.current,
        pin: pinTrigger ?? container.current,
        start: "top top",
        end: `+=${scrollLength}`,
        scrub: 0.5,
        anticipatePin: 1,
      },
    });

    // Phase 1 — cards fly into the stack one after another
    els.forEach((el, i) => {
      const s = slot(i);
      tl.to(el, { x: s.x, y: s.y, opacity: 1, rotate: 0, duration: 0.8, ease: "power2.out" }, i * 0.3);
    });

    // Phase 2 — cycle the deck: every card comes to the front once
    let order = Array.from({ length: total }, (_, i) => i);
    let at = total * 0.3 + 0.9; // after entrance settles
    for (let step = 0; step < total - 1; step++) {
      const [front, ...rest] = order;
      const frontEl = els[front];

      // front card dives down and away
      tl.to(frontEl, { y: slot(0).y + 560, rotate: 7, duration: 0.55, ease: "power1.in" }, at);
      // the rest promote one slot forward
      rest.forEach((idx, i) => {
        const s = slot(i);
        tl.set(els[idx], { zIndex: s.zIndex }, at + 0.12);
        tl.to(els[idx], { x: s.x, y: s.y, z: s.z, duration: 0.55, ease: "power1.inOut" }, at + 0.15);
      });
      // front card tucks into the back of the stack
      const back = slot(total - 1);
      tl.set(frontEl, { zIndex: back.zIndex }, at + 0.55);
      tl.to(frontEl, { x: back.x, y: back.y, z: back.z, rotate: 0, duration: 0.55, ease: "power1.out" }, at + 0.6);

      order = [...rest, front];
      at += 1.35;
    }
    // small settle beat at the end of the pin
    tl.to({}, { duration: 0.4 }, at);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, skewAmount, pinTrigger, scrollLength, refs]);

  const rendered = childArr.map((child, i) =>
    isValidElement<CardProps>(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            child.props.onClick?.(e);
            onCardClick?.(i);
          },
        } as CardProps & React.RefAttributes<HTMLDivElement>)
      : child
  );

  return (
    <div
      ref={container}
      className="relative [perspective:1200px] transform-gpu"
      style={{ width, height }}
    >
      <div className="absolute inset-0 [transform-style:preserve-3d]">{rendered}</div>
    </div>
  );
};

export default CardSwap;
