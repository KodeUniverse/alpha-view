import { Autocomplete, TextField, SxProps } from "@mui/material";
import { Ticker } from "@shared/types";
import { useEffect, useState } from "react";

function SearchBar({
  onTickerSelect,
  value,
  sxProps = {},
}: {
  onTickerSelect: (ticker: Ticker | null) => void;
  value: Ticker | null;
  sxProps: SxProps; // should be SxProps<Theme> once you start using MUI Theme
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
      }
    };
    fetchSymbols();
    setLoading(false);
  }, []);

  return (
    <>
      {isLoading && <p>Loading search...</p>}
      {isError && <p>Error loading ticker search.</p>}
      {!isError && !isLoading && (
        <Autocomplete
          options={symbols}
          getOptionLabel={(option) => option.symbol}
          value={value}
          onChange={(event, newValue) => {
            onTickerSelect(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ticker"
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 5 },
                width: 130,
                ...sxProps,
              }}
            />
          )}
        />
      )}
    </>
  );
}

export default SearchBar;
