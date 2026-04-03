import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createTheme, ThemeProvider } from "@mui/material";

const theme = createTheme({
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-family)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-background-secondary)",
          border: "1px solid #333333",
          borderRadius: 10,
          margin: 5,
          width: "100%",
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: {
          fontFamily: "var(--font-family)",
          fontSize: "var(--font-size-lg)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        },
        subheader: {
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-family)",
        },
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
