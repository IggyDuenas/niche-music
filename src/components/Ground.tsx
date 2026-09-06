"use client";

import { useEffect, useState } from "react";
import {
  colorwayVars,
  nextColorway,
  type Colorway,
} from "@/lib/colorways";

/**
 * Applies a colourway to everything inside it.
 *
 * When `cycle` is set the pressing changes on a slow timer. The first render
 * always uses the `colorway` prop on both server and client — starting from a
 * random one would mismatch during hydration — and only moves on after mount.
 */
export function Ground({
  colorway,
  cycle = false,
  cycleMs = 7000,
  className = "",
  children,
}: {
  colorway: Colorway;
  cycle?: boolean;
  cycleMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState(colorway);

  // A colourway chosen from content (a playlist) can change under us on
  // client-side navigation; follow it.
  useEffect(() => {
    setCurrent(colorway);
  }, [colorway]);

  useEffect(() => {
    if (!cycle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => setCurrent((c) => nextColorway(c)), cycleMs);
    return () => clearInterval(timer);
  }, [cycle, cycleMs]);

  return (
    <div className={`ground cw-fade ${className}`} style={colorwayVars(current)}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
