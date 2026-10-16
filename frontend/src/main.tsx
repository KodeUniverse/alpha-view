import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { MantineProvider, createTheme } from "@mantine/core";
import type { CSSVariablesResolver } from "@mantine/core";
import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: "custom",
  defaultRadius: "sm",
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
          margin: 0,
          width: "100%",
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
    // Modal renders through a portal, so it doesn't inherit the Card's context --
    // it needs its own surface treatment to match.
    Modal: {
      styles: {
        content: {
          backgroundColor: "var(--color-background-secondary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-background-tertiary)",
          borderRadius: 10,
        },
        header: {
          backgroundColor: "var(--color-background-secondary)",
        },
        title: {
          color: "var(--color-text-primary)",
          fontWeight: 700,
        },
        body: {
          color: "var(--color-text-primary)",
        },
        close: {
          color: "var(--color-text-secondary)",
          "&:hover": {
            backgroundColor: "var(--color-hover-overlay)",
          },
        },
        // --color-shadow is rgba(0,0,0,0.1) -- too light for a backdrop.
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        },
      },
    },
  },
});

const cssVariablesResolver: CSSVariablesResolver = () => ({
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
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="dark"
    >
      <App />
    </MantineProvider>
  </StrictMode>,
);
