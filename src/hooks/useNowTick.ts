"use client";

import { useEffect, useState, type DependencyList } from "react";

interface Opts {
  enabled?: boolean; // pause the ticker when false (default true)
  initial?: number | null; // pre-mount value (SSR); default null
  deps?: DependencyList; // resync (reset `now` + restart) when these change
}

// A live "current time in ms" clock that ticks every `intervalMs`. Mounts to
// Date.now() and updates on the interval; pausable via `enabled`; resyncs when
// `deps` change. Shared by the live station buffer + the "working since" badge.
export function useNowTick(
  intervalMs: number,
  opts: { enabled?: boolean; initial: number; deps?: DependencyList },
): number;
export function useNowTick(
  intervalMs: number,
  opts?: { enabled?: boolean; initial?: null; deps?: DependencyList },
): number | null;
export function useNowTick(intervalMs: number, opts: Opts = {}): number | null {
  const { enabled = true, initial = null, deps = [] } = opts;
  const [now, setNow] = useState<number | null>(initial);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, ...deps]);
  return now;
}
