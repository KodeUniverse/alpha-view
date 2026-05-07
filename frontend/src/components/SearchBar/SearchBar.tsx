import { Select, Loader } from "@mantine/core";
import { Ticker } from "@shared/types";
import { useEffect, useState } from "react";

function SearchBar({
  onTickerSelect,
  value,
  styles = {},
}: {
  onTickerSelect: (ticker: Ticker | null) => void;
  value: Ticker | null;
  styles?: React.CSSProperties;
}) {
  const [symbols, setSymbols] = useState<Ticker[]>([]);
  const [isError, setError] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.API_URL}/symbol/list/latest`,
        );

        if (!res.ok)
          throw new Error(`HTTP ${res.status}: Failed to fetch symbol list`);

        const symbolJSON = await res.json();
        const symbolList: Ticker[] = [];
        for (const rowObj of symbolJSON) {
          symbolList.push({ symbol: rowObj.symbol });
        }
        setSymbols(symbolList);
      } catch (error) {
        console.log(error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSymbols();
  }, []);

  const data = symbols.map((t) => ({ value: t.symbol, label: t.symbol }));

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
            onTickerSelect(val ? { symbol: val } : null);
          }}
          searchable
          clearable
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
