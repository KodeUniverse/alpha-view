import { CandlestickSeries, AreaSeries, ColorType, createChart } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

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
                let areaChartColors;
                const upChart = data && data[0]?.value <= data[data.length - 1]?.value;
                areaChartColors = {
                    lineColor: upChart ? "#26a69a" : "#ef5350",
                    topColor: upChart ? "#26a69a" : "#ef5350",
                    bottomColor: upChart ? "rgba(38, 166, 154, 0.28)" : "rgba(239, 83, 80, 0.28)"
                }
                seriesRef.current = chart.addSeries(AreaSeries, areaChartColors)
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
    }, [data]);

    useEffect(() => {
        try {
            if (!data || !seriesRef.current) return;

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
