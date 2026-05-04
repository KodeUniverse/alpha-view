import { Box, Autocomplete, TextField } from "@mui/material";
import { useEffect, useState } from "react";

function SearchBar({ onTickerSelect, value, sxProps = {} }) {
  const [symbols, setSymbols] = useState([]);
  const [isError, setError] = useState(false);
  const [isLoading, setLoading] = useState(false);

  //  const submitHandler = (event) => {
  //    event.preventDefault();
  //    onTickerSelect(selectedTicker);
  //    console.log(`Ticker submitted: ${selectedSymbol}`);
  //  };

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
        const symbolList = [];
        for (const rowObj of symbolJSON) {
          symbolList.push(rowObj.symbol);
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
