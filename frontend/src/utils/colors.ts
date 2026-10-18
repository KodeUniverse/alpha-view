/**
 * Reading a design token.
 *
 * Not a pure util: this touches `document`, so it resolves against whatever color scheme is
 * active *at call time*. Read it during render or inside an effect, never at module scope --
 * a value captured at import time freezes to whichever scheme happened to be active then and
 * never follows a theme toggle.
 *
 * The two call sites that matter are the chart, which needs a concrete string because
 * lightweight-charts hands it straight to a canvas, and the settings menu, whose swatches
 * must match the line they toggle. Both resolve through here, so a swatch cannot drift from
 * its series.
 */
export function getComputedColor(token: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

/** Candle and area-series colors. */
export const CHART_COLOR_TOKENS = {
  up: "--color-chart-up",
  down: "--color-chart-down",
  upFill: "--color-chart-up-fill",
  downFill: "--color-chart-down-fill",
} as const;

/**
 * Chrome the chart draws for itself -- axis text, canvas background, grid lines.
 *
 * Distinct from `CHART_COLOR_TOKENS`, which are the colors of the data being drawn.
 */
export const THEME_COLOR_TOKENS = {
  text: "--color-text-primary",
  background: "--color-background-secondary",
  grid: "--color-chart-grid",
} as const;

/**
 * Moving-average and Bollinger tokens.
 *
 * Only ever used as arguments to `getComputedColor` -- never concatenated into a style
 * string -- so the `var()` form is wrong here; these resolve to concrete colors.
 */
export const INDICATOR_COLOR_TOKENS = {
  sma: "--color-indicator-sma",
  ema: "--color-indicator-ema",
  bollingerMid: "--color-indicator-bollinger-mid",
  bollingerBand: "--color-indicator-bollinger-band",
} as const;