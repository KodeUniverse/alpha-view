import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";

const theme = createTheme({
    components: {
        MuiTypography: {
            styleOverrides: {
                root: {
                    fontFamily: "var(--font-family)",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: "var(--color-background-secondary)",
                    color: "var(--color-text-primary)"
                }
            }
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
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiInputBase-input': { color: 'var(--color-text-primary)' },
                    '& .MuiInputLabel-root': { color: 'var(--color-text-primary)' },
                    '& .MuiOutlinedInput-root': { backgroundColor: 'var(--color-background-secondary)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-text-primary)' },
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                option: {
                    "&.Mui-focused": {
                        backgroundColor: "var(--color-highlighted) !important"
                    }
                }
            }
        }
    },
});

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </StyledEngineProvider>
    </StrictMode>,
);
