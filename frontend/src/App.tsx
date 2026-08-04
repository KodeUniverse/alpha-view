import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FinanceDashboard from "@/routes/FinanceDashboard/FinanceDashboard.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlpacaDataContextProvider } from "@/services/MarketDataProvider/MarketDataContext";

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AlpacaDataContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<FinanceDashboard />} />
          </Routes>
        </BrowserRouter>
      </AlpacaDataContextProvider>
    </QueryClientProvider>
  );
}
export default App;
