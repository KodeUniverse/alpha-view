const TRADING_DAYS_PER_YEAR = 252;

export interface QuantMetrics {
  sharpeRatio: number;
  volatility: number;
  sortinoRatio: number;
  maxDrawdown: number;
  var95: number;
}

function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] === 0) continue;
    returns.push(closes[i] / closes[i - 1] - 1);
  }
  return returns;
}

function mean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - avg) * (v - avg), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function maxDrawdown(closes: number[]): number {
  let peak = closes[0] ?? 0;
  let maxDd = 0;
  for (const close of closes) {
    if (close > peak) peak = close;
    const drawdown = (close - peak) / peak;
    if (drawdown < maxDd) maxDd = drawdown;
  }
  return maxDd;
}

function historicalVaR(returns: number[], alpha = 0.05): number {
  if (returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.max(0, Math.floor(alpha * sorted.length) - 1);
  return sorted[index];
}

export function computeQuantMetrics(closes: number[]): QuantMetrics | null {
  if (closes.length < 2) return null;
  const returns = dailyReturns(closes);
  if (returns.length < 2) return null;

  const riskFreeRate = 0;
  const avgReturn = mean(returns);
  const vol = stddev(returns);
  const annualizedVol = vol * Math.sqrt(TRADING_DAYS_PER_YEAR);

  const downside = returns.filter((r) => r < riskFreeRate);
  const downsideDev =
    downside.length > 0
      ? Math.sqrt(
          downside.reduce((acc, r) => acc + (r - riskFreeRate) ** 2, 0) /
            downside.length,
        )
      : 0;

  const annualizedReturn = (avgReturn + 1) ** TRADING_DAYS_PER_YEAR - 1;
  const sharpeRatio =
    annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0;
  const sortinoRatio =
    downsideDev > 0
      ? (annualizedReturn - riskFreeRate) /
        (downsideDev * Math.sqrt(TRADING_DAYS_PER_YEAR))
      : 0;

  return {
    sharpeRatio,
    volatility: annualizedVol,
    sortinoRatio,
    maxDrawdown: maxDrawdown(closes),
    var95: historicalVaR(returns),
  };
}
