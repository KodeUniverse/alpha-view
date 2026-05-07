import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FinanceDashboard from "@routes/FinanceDashboard/FinanceDashboard.tsx";
import LoginPage from "@routes/LoginPage.tsx";
import { socket } from "@services/socket.ts";

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FinanceDashboard />} />
        <Route path="/login" element={<LoginPage styles={{ width: 500 }} />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
