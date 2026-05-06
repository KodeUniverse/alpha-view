import { Card, Table, Text, Group } from "@mantine/core";

const dummyMetrics: MetricRow[] = [
  // Column 1 - Valuation
  { key: "PE Ratio", value: "24.5" },
  { key: "Forward PE", value: "21.3" },
  { key: "PEG", value: "1.8" },
  { key: "P/Sales", value: "6.2" },
  { key: "P/Book", value: "35.8" },
  { key: "Market Cap", value: "$2.8T" },
  { key: "Ent. Value", value: "$2.9T" },
  // Column 2 - Profitability & Growth
  { key: "ROE", value: "42.1%" },
  { key: "ROA", value: "18.7%" },
  { key: "ROIC", value: "28.3%" },
  { key: "Profit Margin", value: "22.4%" },
  { key: "Op. Margin", value: "30.1%" },
  { key: "Gross Margin", value: "43.2%" },
  { key: "Rev. Growth", value: "8.2%" },
  // Column 3 - Technical
  { key: "RSI (14)", value: "58.3" },
  { key: "SMA 20", value: "$182.4" },
  { key: "SMA 50", value: "$178.9" },
  { key: "SMA 200", value: "$165.2" },
  { key: "EMA 12", value: "$183.1" },
  { key: "EMA 26", value: "$180.5" },
  { key: "52W High", value: "$198.2" },
  { key: "52W Low", value: "$124.1" },
  // Column 4 - Risk & Volatility
  { key: "Beta", value: "1.24" },
  { key: "Sharpe", value: "1.42" },
  { key: "Sortino", value: "1.68" },
  { key: "3M Vol", value: "18.2%" },
  { key: "1Y Vol", value: "22.5%" },
  { key: "5Y Vol", value: "19.8%" },
  { key: "10Y Vol", value: "21.1%" },
  // Column 5 - Volume & Short
  { key: "Volume", value: "52.3M" },
  { key: "Avg Vol (3M)", value: "48.7M" },
  { key: "Rel Volume", value: "1.07" },
  { key: "Short Ratio", value: "2.8" },
  { key: "Short Int.", value: "1.2%" },
  { key: "Days Cov.", value: "2.1" },
  // Column 6 - Dividends & Health
  { key: "Div. Yield", value: "0.52%" },
  { key: "Div. Rate", value: "$0.96" },
  { key: "Payout", value: "14.8%" },
  { key: "D/E", value: "1.45" },
  { key: "Curr. Ratio", value: "1.08" },
  { key: "Quick Ratio", value: "0.93" },
  { key: "Int. Cov.", value: "18.5x" },
];

interface MetricRow {
  key: string;
  value: string;
}

interface MetricsCardProps {
  columns?: number;
  styles?: React.CSSProperties;
}
function MetricsCard({ columns = 6, styles = {} }: MetricsCardProps) {
  const colSize = Math.ceil(dummyMetrics.length / columns);

  const colsToRender = Array.from({ length: columns }, (_, i) =>
    dummyMetrics.slice(i * colSize, (i + 1) * colSize).filter((m) => m !== undefined),
  );

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
              {metric.value}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Card style={styles}>
      <Text fw={700} size="lg" mb={5}>Quick Metrics</Text>
      <Group gap={0} wrap="nowrap">
        {colsToRender.map((col, i) => (
          <div key={i} style={{ width: `${100 / columns}%` }}>
            {renderColumn(col)}
          </div>
        ))}
      </Group>
    </Card>
  );
}

export default MetricsCard;
