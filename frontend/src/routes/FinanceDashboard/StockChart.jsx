import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";

/*
 * Researching TradingView lightweight-charts. It is pretty complex.
 * Check the docs here: https://tradingview.github.io/lightweight-charts/tutorials/react/advanced
 *
 * Seems like I will have to learn Context API to avoid prop drilling
 * (Need to define chart colors, etc. at application level and pass thru props, thereby drilling
 * or Context API)
 *
 * Also consider for ease of use, just using a wrapper library for TradingView charts.
 * Two of them are below:
 * https://github.com/trash-and-fire/lightweight-charts-react-wrapper
 * https://github.com/ukorvl/lightweight-charts-react-components
 *
 * */
export default function StockChart({ data, chartOptions = {
    layout:
    {
        textColor: 'white',
        background: { type: 'solid', color: 'black' },
        attributionLogo: false
    }
} }) {

    const chartContainerRef = useRef(null);
    const ohlcSeriesRef = useRef(null);

    useEffect(() => {
        const chart = createChart(chartContainerRef.current, chartOptions);
        ohlcSeriesRef.current = chart.addSeries(CandlestickSeries, { upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' })

        chart.timeScale().fitContent();

        return () => chart.remove();
    }, []);

    useEffect(() => {
        if (!data || !ohlcSeriesRef.current) return;
        ohlcSeriesRef.current.setData(data);
    }, [data]);

    return (
        <>
            <div ref={chartContainerRef} style={{ height: "400px" }}></div>
        </>);
}
