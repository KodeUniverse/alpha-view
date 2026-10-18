import { useEffect, useState } from "react";

/**
 * A wall-clock tick that re-renders its caller.
 *
 * Exists so elapsed-time logic can be evaluated in a memo. Staleness checks cannot rely on
 * data arrival: a dead feed produces no bars, which means no re-render, which means a memo
 * reading Date.now() would freeze on the last good value -- reporting a healthy feed on one
 * that died five minutes ago.
 *
 * The interval only needs to be short relative to the staleness threshold it serves, not
 * relative to how often data arrives.
 */
export function useNow(intervalMs = 5_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}