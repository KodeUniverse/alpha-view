import { useBasicFinancials } from "@/hooks/queries";
import { Card, Table, Text, Group } from "@mantine/core";
import { Ticker } from "@shared/types";

interface MetricRow {
  key: string;
  value: string;
}

interface MetricsCardProps {
  ticker: Ticker;
  columns?: number;
  styles?: React.CSSProperties;
}
function MetricsCard({ ticker, columns = 6, styles = {} }: MetricsCardProps) {
  const { data, isError, isLoading, error } = useBasicFinancials(ticker);

  const financials = data
    ? Object.entries(data).map(([k, v]) => {
        return { key: k, value: v } as MetricRow;
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
              {metric.value}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Card style={styles}>
      <Text fw={700} size="lg" mb={5}>
        Quick Metrics
      </Text>
      {isLoading && !isError && <Text>Loading...</Text>}
      {!isLoading && isError && <Text>Error loading financials.</Text>}
      {!isLoading && !isError && colsToRender && (
        <Group gap={0} wrap="nowrap">
          {colsToRender.map((col, i) => (
            <div key={i} style={{ width: `${100 / columns}%` }}>
              {renderColumn(col)}
            </div>
          ))}
        </Group>
      )}
    </Card>
  );
}

export default MetricsCard;
