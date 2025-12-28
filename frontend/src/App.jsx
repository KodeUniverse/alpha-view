import { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import FinanceDashboard from '@routes/FinanceDashboard/FinanceDashboard.jsx'
import HomePage from '@routes/Home/HomePage.jsx';
import { socket } from '@services/socket';

function App() {
    
    const [isConnected, setConnected] = useState(socket.connected);  

    useEffect(() => {
        
        const onConnect = () => { setConnected(true) };
        const onDisconnect = () => { setConnected(false) };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        }
    }, []);
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
