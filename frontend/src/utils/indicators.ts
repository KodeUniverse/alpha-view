import { Frequency } from "@/types";
import type { LineWidth } from "lightweight-charts";

export function sma(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i];
    if (i >= period) sum -= prices[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

export function ema(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  const multiplier = 2 / (period + 1);
  let prevEma = 0;
  for (let i = 0; i < period; i++) prevEma += prices[i];
  prevEma /= period;
  result[period - 1] = prevEma;

  for (let i = period; i < prices.length; i++) {
    prevEma = (prices[i] - prevEma) * multiplier + prevEma;
    result[i] = prevEma;
  }
  return result;
}

function stddev(values: number[]): number {
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

export interface BollingerBands {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export function bollingerBands(
  prices: number[],
  period = 20,
  multiplier = 2,
): BollingerBands {
  const middle = sma(prices, period);
  const upper: (number | null)[] = new Array(prices.length).fill(null);
  const lower: (number | null)[] = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    const window = prices.slice(i - period + 1, i + 1);
    const mid = middle[i]!;
    const dev = stddev(window) * multiplier;
    upper[i] = mid + dev;
    lower[i] = mid - dev;
  }
  return { middle, upper, lower };
}

//====================================================================================================
//                                                 INDICATOR CATALOGUE
//====================================================================================================

export const BOLLINGER_PERIOD = 20;
export const BOLLINGER_MULTIPLIER = 2;

// Which periods each frequency offers. A "20-period" average spans 20 minutes, 20 sessions,
// 20 weeks or 20 months depending on the bar size, so the number has to move with the
// frequency to stay inside the history the provider actually serves: 200 weeks needs ~3.8
// years, which fits, but 200 months needs ~16.7 years and would never plot a value at all.
// Weekly and monthly therefore offer the same short-horizon set instead.
export const INDICATOR_PERIODS: Record<Frequency, number[]> = {
  intraday: [20, 50, 100, 200],
  daily: [20, 50, 100, 200],
  weekly: [3, 6, 12, 24],
  monthly: [3, 6, 12, 24],
};

// Suffix appended to a menu label, so the bare number says what span it covers.
export const PERIOD_UNIT: Record<Frequency, string> = {
  intraday: "m",
  daily: "d",
  weekly: "w",
  monthly: "mo",
};

// Every period any frequency offers. The chart builds one line series per (family, period)
// up front and toggles its visibility, so this is the full series set across all frequencies.
export const ALL_INDICATOR_PERIODS: number[] = Object.values(INDICATOR_PERIODS)
  .flat()
  .filter((period, i, all) => all.indexOf(period) === i);

// Rank of a period inside its own frequency's list: 0 is the shortest span and gets the
// strongest line. The period sets are disjoint per frequency, so one flat map is unambiguous.
export const PERIOD_RANK: Record<number, number> = Object.values(
  INDICATOR_PERIODS,
).reduce(
  (ranks, periods) => {
    periods.forEach((period, rank) => {
      ranks[period] = rank;
    });
    return ranks;
  },
  {} as Record<number, number>,
);

// Calendar days of history to fetch *before* the visible window. A moving average is `null`
// until it has `period` bars behind it, so an indicator drawn only from the bars on screen
// shows nothing whenever the visible range is shorter than the period. This is what extends
// backwards from `visibleStart` -- it does NOT depend on how long the visible range is, which
// already sets `visibleStart` itself.
//
// Derived from the longest period each frequency offers (INDICATOR_PERIODS) at the realistic
// bar rate: 252 sessions/yr, 390 min/session, 1 bar/week, 1 bar/30.44 days.
//
//   intraday  200 bars / (390 x 252 / 365 = 269 bars-per-day) = 0.7 days; 5 covers it many
//             times over and absorbs a weekend plus a market holiday
//   daily     200 bars / (252 / 365 = 0.690 bars-per-day)       = 290 days; 320 for margin
//   weekly    24 bars / (1/7)                                   = 168 days
//   monthly   24 bars / (1/30.44)                               = 731 days; 740 to clear it
//
// The provider returns whatever history it holds, so a symbol that listed recently -- or a
// plan that does not reach back that far -- yields nulls rather than wrong numbers.
export const INDICATOR_WARMUP_DAYS: Record<Frequency, number> = {
  intraday: 5,
  daily: 320,
  weekly: 168,
  monthly: 740,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The window to request: the visible range extended backwards by the warm-up, so one response
// carries both the bars to draw and the bars needed to seed the longest indicator.
export function indicatorWarmupStart(
  frequency: Frequency,
  visibleStart: Date,
): Date {
  return new Date(
    visibleStart.getTime() - INDICATOR_WARMUP_DAYS[frequency] * MS_PER_DAY,
  );
}

//====================================================================================================
//                                                LINE COLOURS
//====================================================================================================

// One amber ramp for the simple averages, one blue ramp for the exponential ones, so a family
// reads at a glance and the period is carried by weight instead of by hue. Alpha and width fall
// off with the period rank: the shortest average is the strongest line, the longest is a faint
// background reference. Exported so the settings menu can swatch the exact line it toggles.
export const MOVER_COLORS = {
  sma: "#f0b90b",
  ema: "#3b82f6",
} as const;

export const MOVER_ALPHA = [1, 0.78, 0.6, 0.45] as const;

export const MOVER_LINE_WIDTH: LineWidth[] = [2, 2, 1, 1];

export const BOLLINGER_COLORS = {
  mid: "rgba(225, 32, 102, 0.85)",
  band: "rgba(225, 32, 102, 0.45)",
} as const;

export type MoverFamily = keyof typeof MOVER_COLORS;

// 8-digit hex is CSS Color 4 and is what lightweight-charts hands to the canvas, so the ramp is
// a base hue plus an alpha byte rather than a hand-written rgba() for every period.
export function moverColor(family: MoverFamily, period: number): string {
  const rank = Math.min(PERIOD_RANK[period] ?? 0, MOVER_ALPHA.length - 1);
  const alphaByte = Math.round(MOVER_ALPHA[rank] * 255)
    .toString(16)
    .padStart(2, "0");
  return `${MOVER_COLORS[family]}${alphaByte}`;
}

export function moverLineWidth(period: number): LineWidth {
  const rank = Math.min(PERIOD_RANK[period] ?? 0, MOVER_LINE_WIDTH.length - 1);
  return MOVER_LINE_WIDTH[rank];
}

export interface ChartIndicators {
  // Keyed by period rather than by a fixed key per period, because the set of periods depends
  // on the selected frequency. Periods the current frequency does not offer are pruned on the
  // frequency change.
  sma: Record<number, boolean>;
  ema: Record<number, boolean>;
  bollinger: boolean;
}

export const DEFAULT_INDICATORS: ChartIndicators = {
  sma: { 200: true },
  ema: { 20: true },
  bollinger: true,
};
