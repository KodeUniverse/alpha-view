import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FinanceDashboard from "@routes/FinanceDashboard/FinanceDashboard.tsx";
import LoginPage from "@routes/LoginPage.tsx";
import {
  AlpacaDataContextProvider,
  FinnhubDataContextProvider,
} from "@services/MarketDataProvider/MarketDataContext";

function App() {
  return (
    <FinnhubDataContextProvider>
      <AlpacaDataContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<FinanceDashboard />} />
            <Route
              path="/login"
              element={<LoginPage styles={{ width: 500 }} />}
            />
          </Routes>
        </BrowserRouter>
      </AlpacaDataContextProvider>
    </FinnhubDataContextProvider>
  );
}
export default App;
