import { useBasicFinancials } from "@/hooks/queries";
import { Card, Table, Text, Group } from "@mantine/core";
import { StockBasicFinancials, Ticker } from "@shared/types";

interface MetricRow {
  key: string;
  value: number;
}

interface MetricsCardProps {
  ticker: Ticker;
  columns?: number;
  styles?: React.CSSProperties;
}

const FinancialsNameMapping: Record<keyof StockBasicFinancials, string> = {
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
  forwardEps: "Forward EPS",

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
  quickRatio: "Quick Ratio",
  interestCoverage: "Interest Cov.",

  // Per Share
  bookValue: "Book Value",
  revenuePerShare: "Rev. per Share",
  dividendPerShare: "Div. per Share",

  // Dividends
  divYieldTTM: "Dividend Yield (TTM)",
  payoutRatio: "Payout Ratio",

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

function MetricsCard({ ticker, columns = 6, styles = {} }: MetricsCardProps) {
  const { data, isError, isLoading, error } = useBasicFinancials(ticker);

  const financials = data
    ? Object.entries(data).map(([k, v]) => {
        return { key: FinancialsNameMapping[k], value: v } as MetricRow;
      })
    : null;
  let colsToRender: MetricRow[][];
  if (financials) {
    const colSize = Math.ceil(financials.length / columns);

    colsToRender = Array.from({ length: columns }, (_, i) =>
      financials
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
              {!metric.value ? "—" : Math.round(metric.value * 100) / 100}
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
