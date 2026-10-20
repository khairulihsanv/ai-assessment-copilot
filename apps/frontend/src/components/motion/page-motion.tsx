"use client";
import { useEffect } from "react";
/** Reveal effects enhance server-rendered content; a no-JS page remains readable. */
export function PageMotion() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    root.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-seen", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    const nodes = document.querySelectorAll("[data-reveal]");
    for (const node of nodes) observer.observe(node);
    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);
  return null;
}
