import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FinanceDashboard from "@/routes/FinanceDashboard/FinanceDashboard.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FinanceDashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
export default App;
