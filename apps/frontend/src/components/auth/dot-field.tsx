"use client";

import { useEffect, useRef } from "react";

/**
 * Full-screen dot grid whose dots light up around the cursor (same idea as the
 * landing hero). CSS-only rendering: we just feed the cursor position to a mask.
 * Touch devices and reduced-motion users get the static grid.
 */
export function DotField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const canTrack =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canTrack) return;

    let frame = 0;
    let x = -999;
    let y = -999;
    const apply = () => {
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      frame = 0;
    };
    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      x = -999;
      y = -999;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="auth-dots" />;
}
