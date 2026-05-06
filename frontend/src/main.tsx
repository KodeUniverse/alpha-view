import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { MantineProvider, createTheme, DEFAULT_THEME } from "@mantine/core";
import type { CSSVariablesResolver } from "@mantine/core";
import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: "custom",
  colors: {
    custom: [
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
      "var(--color-highlighted)",
    ],
  },
  components: {
    Card: {
      styles: {
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
    CardHeader: {
      styles: {
        title: {
          fontSize: "var(--font-size-lg)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        },
        subheader: {
          color: "var(--color-text-secondary)",
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-background-secondary)",
        },
        label: {
          color: "var(--color-text-primary)",
        },
      },
    },
  },
});

const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {
    "--mantine-color-body": "var(--color-background-primary)",
    "--mantine-color-text": "var(--color-text-primary)",
  },
  light: {
    "--mantine-color-body": "var(--color-background-primary)",
    "--mantine-color-text": "var(--color-text-primary)",
  },
  dark: {
    "--mantine-color-body": "var(--color-background-primary)",
    "--mantine-color-text": "var(--color-text-primary)",
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>,
);
