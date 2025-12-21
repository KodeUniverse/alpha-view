import { useState } from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import FinanceDashboard from '@/routes/FinanceDashboard/FinanceDashboard.jsx'
import HomePage from '@/routes/Home/HomePage.jsx';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={ <HomePage /> } />
                <Route path="finance" element={ <FinanceDashboard /> } />
                {/*<Route path="news" element={} />*/}
            </Routes>
        </BrowserRouter>
    )   
}

export default App;
