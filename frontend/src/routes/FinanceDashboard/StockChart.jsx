import { CandlestickSeries, AreaSeries, ColorType, createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";

export default function StockChart({ data, chartType, containerStyles = { width: "100%", height: "100%" }, chartOptionOverride = {} }) {
    const chartContainerRef = useRef(null);
    const seriesRef = useRef(null);

    const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-background-secondary")
        .trim();
    const separatorColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-chart-panes")
        .trim();
    const chartOptions = {
        layout: {
            textColor: "white",
            background: {
                type: ColorType.Solid,
                color: bgColor,
            },
            attributionLogo: false,
            panes: {
                enableResize: true,
                separatorColor: separatorColor,
            },
        },
        //    autoSize: true,
    };
    useEffect(() => {
        const chart = createChart(chartContainerRef.current, chartOptions);

        switch (chartType) {
            case "candle": {
                seriesRef.current = chart.addSeries(CandlestickSeries, {
                    upColor: "#26a69a",
                    downColor: "#ef5350",
                    borderVisible: true,
                    wickUpColor: "#26a69a",
                    wickDownColor: "#ef5350",
                });
                break;
            }
            case "area": {
                seriesRef.current = chart.addSeries(AreaSeries, {
                    lineColor: "#26a69a",
                    topColor: "#26a69a",
                    bottomColor: "rgba(38, 166, 154, 0.28)"
                })
                break;
            }
        }

        chart.timeScale().fitContent();

        const resizer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            let { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });

        resizer.observe(chartContainerRef.current);

        return () => {
            chart.remove();
            resizer.disconnect();
        };
    }, []);

    useEffect(() => {
        try {
            if (!data || !seriesRef.current) return;
            console.log(`Data set to stockchart: ${JSON.stringify(data[0])}`)
            seriesRef.current.setData(data);
        } catch (error) {
            console.log(error);
        }
    }, [data]);

    return (
        <div
            className="chart-container"
            ref={chartContainerRef}
            style={containerStyles}
        ></div>
    );
}
