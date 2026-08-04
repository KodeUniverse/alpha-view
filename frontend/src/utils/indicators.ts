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
