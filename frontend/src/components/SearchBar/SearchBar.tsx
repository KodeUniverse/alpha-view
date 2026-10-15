import { Select, Loader, ComboboxData, Text, Stack } from "@mantine/core";
import { useMemo } from "react";
import { Ticker } from "@/types";
import { useSymbolList } from "@/hooks/queries";

function SearchBar({
  onTickerSelect,
  value,
  styles = {},
}: {
  onTickerSelect: (ticker: Ticker | null) => void;
  value: Ticker | null;
  styles?: React.CSSProperties;
}) {
  const { data: symbols, isLoading, isError, error } = useSymbolList();

  // Symbol -> full ticker, so we can match and render on `name` without threading
  // it through ComboboxData (whose `label` has to stay the symbol, since that is
  // what `value`/`onChange` speak).
  const bySymbol = useMemo(
    () => new Map((symbols ?? []).map((t) => [t.symbol, t])),
    [symbols],
  );

  const data: ComboboxData = useMemo(
    () => (symbols ?? []).map((t) => ({ value: t.symbol, label: t.symbol })),
    [symbols],
  );

  if (isError) {
    console.log(error);
  }

  return (
    <>
      {isLoading && <Loader size="sm" />}
      {isError && <p>Error loading ticker search.</p>}
      {!isError && !isLoading && (
        <Select
          placeholder="Search ticker..."
          data={data}
          value={value?.symbol || null}
          onChange={(val) => {
            // Prefer the real name from the symbol list; only fall back to the
            // symbol if it somehow isn't there.
            const found = val ? bySymbol.get(val) : null;
            onTickerSelect(found ?? (val ? { symbol: val, name: val } : null));
          }}
          searchable
          clearable
          limit={100}
          // Custom filter so typing a company name matches too. Mantine's default
          // filter only matches the label -- and only matches against `label`.
          filter={({ options, search, limit }) => {
            const q = search.trim().toLowerCase();
            const matched = q
              ? options.filter((option) => {
                  if ("items" in option) return false; // not a flat list
                  const name = bySymbol.get(option.value)?.name ?? "";
                  return (
                    option.value.toLowerCase().includes(q) ||
                    name.toLowerCase().includes(q)
                  );
                })
              : options;
            // The custom filter replaces the built-in one, so it must apply limit.
            return matched.slice(0, limit);
          }}
          renderOption={({ option }) => {
            const name = bySymbol.get(option.value)?.name;
            return (
              <Stack gap={0}>
                <Text size="sm" fw={600}>
                  {option.value}
                </Text>
                <Text size="xs" c="dimmed">
                  {name ?? "—"}
                </Text>
              </Stack>
            );
          }}
          style={{ width: 130, ...styles }}
          styles={{
            input: { borderRadius: 5 },
          }}
        />
      )}
    </>
  );
}

export default SearchBar;