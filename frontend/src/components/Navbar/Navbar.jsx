import pyramidGif from "@assets/pyramid.gif";
import alphaLogo from "@assets/alpha-view-logo.png";
import {
  Autocomplete,
  TextField,
  Box,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Navbar({setTicker}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minWidth: "30%",
        }}
      >
        <img
          src={pyramidGif}
          alt="Logo icon, picture of spinning pyramid"
          width="100"
          height="100"
        />
        <img src={alphaLogo} alt="AlphaView Logo" width="300" height="40" />
        <SearchBar setTicker={setTicker} sxProps={{marginLeft: 2}}/>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", marginRight: 5 }}>
        <Button
          component={Link}
          to="/login"
          sx={{
            border: "1px solid",
            borderColor: "var(--color-highlighted)",
            color: "var(--color-text-primary)",
          }}
        >
          Login | Create Account
        </Button>
      </Box>
    </Box>
  );
}

function SearchBar({setTicker, sxProps = {}}) {
  
  const [ symbols, setSymbols ] = useState([]);
  const [ isError, setError ] = useState(false);
  const [ isLoading, setLoading ] = useState(false);
  const [ selectedSymbol, setSelectedSymbol ] = useState(null);

  const submitHandler = (event) => {
      event.preventDefault();
      setTicker(selectedSymbol);
      console.log(`Ticker submitted: ${selectedSymbol}`)
  };

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
      <Box component="form" onSubmit={submitHandler} noValidate>
      <Autocomplete
        options={symbols}
        value={selectedSymbol}
        onChange={(event, newValue) => setSelectedSymbol(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Ticker"
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: 5 },
              width: 130,
              ...sxProps
            }}
          />
        )}
      />
      </Box>
      )}
  </>
);}

export default Navbar;
