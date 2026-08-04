import { useBasicFinancials, useBarsForTicker } from "@/hooks/queries";
import { Card, Table, Text, Group } from "@mantine/core";
import { StockBasicFinancials, Ticker } from "@shared/types";
import { computeQuantMetrics } from "@/utils/quant";
import { useMemo } from "react";

interface MetricRow {
  key: string;
  value: number;
  pct?: boolean;
}

interface MetricsCardProps {
  ticker: Ticker;
  columns?: number;
  styles?: React.CSSProperties;
}

const FinancialsNameMapping: Partial<Record<keyof StockBasicFinancials, string>> = {
  // Valuation
  peTTM: "P/E (TTM)",
  forwardPE: "Forward P/E",
  pb: "P/B",
  priceToSalesTTM: "P/S (TTM)",
  pegTTM: "PEG Ratio (TTM)",
  evToEBITDA: "EV/EBITDA",
  evToRevenue: "EV/Revenue",
  marketCap: "Market Cap",
  enterpriseValue: "Enterprise Value",

  // Earnings
  epsTTM: "EPS (TTM)",

  // Profitability
  roe: "Return on Equity",
  netProfitMargin: "Net Profit Margin",
  grossMargin: "Gross Margin",
  operatingMargin: "Operating Margin",

  // Growth
  revenueGrowth: "Rev. Growth",
  epsGrowth: "EPS Growth",

  // Financial Health
  debtToEquity: "Debt/Equity",
  totalDebt: "Total Debt",
  totalCash: "Total Cash",
  netDebt: "Net Debt",
  currentRatio: "Current Ratio",
  interestCoverage: "Interest Cov.",

  // Per Share
  bookValue: "Book Value",

  // Dividends
  divYieldTTM: "Dividend Yield (TTM)",

  // Cash Flow
  freeCashFlow: "FCF",
  operatingCashFlow: "Op. Cash Flow",

  // Market
  sharesOutstanding: "Shares Outstanding",
  yearHigh: "52W High",
  yearLow: "52W Low",

  // Volume
  adtv10Day: "10D ADTV",

  // Risk
  beta: "Beta",
};

function formatMetric(metric: MetricRow) {
  if (metric.value == null || Number.isNaN(metric.value)) return "—";
  if (metric.pct) return `${(metric.value * 100).toFixed(2)}%`;
  return Math.round(metric.value * 100) / 100;
}

function MetricsCard({ ticker, columns = 6, styles = {} }: MetricsCardProps) {
  const { data, isError, isLoading } = useBasicFinancials(ticker);

  const { start, end } = useMemo(() => {
    const end = new Date();
    const start = new Date(
      end.getFullYear() - 1,
      end.getMonth(),
      end.getDate(),
    );
    return { start, end };
  }, []);

  const { data: bars } = useBarsForTicker(ticker, "daily", start, end);

  const quantMetrics = useMemo(() => {
    if (!bars || bars.length < 2) return null;
    const closes = bars.map((bar) => bar.close);
    return computeQuantMetrics(closes);
  }, [bars]);

  const quantRows: MetricRow[] | null = quantMetrics
    ? [
        { key: "Sharpe Ratio", value: quantMetrics.sharpeRatio },
        { key: "Volatility (Ann.)", value: quantMetrics.volatility, pct: true },
        { key: "Sortino Ratio", value: quantMetrics.sortinoRatio },
        { key: "Max Drawdown", value: quantMetrics.maxDrawdown, pct: true },
        { key: "VaR (95%)", value: quantMetrics.var95, pct: true },
      ]
    : null;

  const financials = data
    ? Object.entries(data)
        .filter(([k]) => FinancialsNameMapping[k as keyof StockBasicFinancials])
        .map(([k, v]) => {
          return {
            key: FinancialsNameMapping[k as keyof StockBasicFinancials],
            value: v as number,
          } as MetricRow;
        })
    : null;
  let colsToRender: MetricRow[][];
  if (financials) {
    const rows = [...financials, ...(quantRows ?? [])];
    const colSize = Math.ceil(rows.length / columns);

    colsToRender = Array.from({ length: columns }, (_, i) =>
      rows
        .slice(i * colSize, (i + 1) * colSize)
        .filter((m) => m !== undefined),
    );
  }

  const renderColumn = (metrics: MetricRow[]) => (
    <Table style={{ width: "100%", fontSize: "var(--font-size-sm)" }}>
      <Table.Tbody>
        {metrics.map((metric) => (
          <Table.Tr key={metric.key}>
            <Table.Td
              style={{
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                padding: "3px 8px",
                border: "none",
              }}
            >
              {metric.key}
            </Table.Td>
            <Table.Td
              style={{
                textAlign: "right",
                padding: "3px 8px",
                border: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatMetric(metric)}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Card style={styles}>
      <Text fw={700} size="lg" mb={5}>
        Financials
      </Text>
      {isLoading && !isError && <Text>Loading...</Text>}
      {!isLoading && isError && <Text>Error loading financials.</Text>}
      {!isLoading && !isError && colsToRender && (
        <Group gap={0} wrap="nowrap">
          {colsToRender.map((col, i) => (
            <div
              key={i}
              style={{ fontWeight: 700, width: `${100 / columns}%` }}
            >
              {renderColumn(col)}
            </div>
          ))}
        </Group>
      )}
    </Card>
  );
}

export default MetricsCard;
