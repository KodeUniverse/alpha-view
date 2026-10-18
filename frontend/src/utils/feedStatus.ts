import { FeedSocketState } from "@/api/client";
import { FeedHealth, MarketClock } from "@/types";

// Pure derivation only -- anything touching React lives in hooks/ (see hooks/useNow.ts).
//
// `FeedStatus` is hand-written rather than zod-derived, which is a deliberate exception to
// the schema rule: it is derived view state computed from already-validated inputs, never a
// shape that crosses the network, so there is no response for a schema to parse.

// Alpaca publishes a minute bar per minute while a symbol trades, so a gap longer than this
// during open hours means something is wrong. Deliberately generous: an illiquid ticker can
// go minutes without a print, so bar cadence corroborates a fault rather than proving one.
const STALE_AFTER_MS = 90_000;

type FeedState = "live" | "closed" | "down";

interface FeedStatus {
  state: FeedState;
  label: string;
  detail: string;
}

function formatNextOpen(nextOpen: Date): string {
  return nextOpen.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

/**
 * Reduce the four signals to one of three states.
 *
 * Ordering is the point: every fault check runs before the closed check, so a stream that
 * died over a holiday still reports FEED DOWN instead of hiding behind MARKET CLOSED. The
 * reverse would tell the user everything is fine right before they miss the open.
 */
export function deriveFeedStatus(input: {
  socketState: FeedSocketState;
  healthError: boolean;
  health?: FeedHealth;
  clockError: boolean;
  clock?: MarketClock;
  lastBarAt: number | null;
  now: number;
}): FeedStatus {
  const { socketState, health, clock, lastBarAt, now } = input;

  const down = (detail: string): FeedStatus => ({
    state: "down",
    label: "FEED DOWN",
    detail,
  });

  if (input.healthError) return down("backend unreachable");
  if (health?.status === "degraded")
    return down(`stream ${health.stream}, dispatcher ${health.dispatcher}`);
  if (socketState === "closed") return down("reconnecting");
  // With no clock, "shut" and "broken" are indistinguishable. Claiming LIVE would assert a
  // liveness we have not verified, so report the missing signal instead.
  if (input.clockError) return down("session status unavailable");

  if (clock && !clock.isOpen) {
    return {
      state: "closed",
      label: "MARKET CLOSED",
      detail: `opens ${formatNextOpen(clock.nextOpen)}`,
    };
  }

  if (lastBarAt != null && now - lastBarAt > STALE_AFTER_MS) {
    return down(`no data for ${Math.round((now - lastBarAt) / 60_000)}m`);
  }

  return {
    state: "live",
    label: "LIVE",
    detail: lastBarAt == null ? "awaiting first bar" : "streaming",
  };
}

/**
 * Exported so the indicator component can type its prop off the derivation instead of
 * restating the shape by hand.
 */
export type { FeedStatus, FeedState };