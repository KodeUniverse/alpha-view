import { Select, Loader, ComboboxData } from "@mantine/core";
import { Ticker } from "@shared/types";
import { useSymbolList } from "@/hooks/queries";
import { useMemo } from "react";

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
  if (isError) {
    console.log(error);
  }
  let data: ComboboxData;
  if (symbols != null) {
    data = symbols.map((t) => ({ value: t.symbol, label: t.symbol }));
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
            onTickerSelect(val ? { symbol: val, name: val } : null);
          }}
          searchable
          clearable
          limit={100}
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
