import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FinanceDashboard from "@routes/FinanceDashboard/FinanceDashboard.tsx";
import LoginPage from "@routes/LoginPage.tsx";
import { socket } from "@services/socket.ts";
import { MarketDataProviderRoot } from "@services/MarketDataProvider/MarketDataContext";

function App() {
  const [isConnected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
    };
    const onDisconnect = () => {
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <MarketDataProviderRoot>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FinanceDashboard />} />
          <Route
            path="/login"
            element={<LoginPage styles={{ width: 500 }} />}
          />
        </Routes>
      </BrowserRouter>
    </MarketDataProviderRoot>
  );
}
export default App;
