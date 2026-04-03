import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";

export default function StockChart({ data }) {
  const chartContainerRef = useRef(null);
  const ohlcSeriesRef = useRef(null);

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
    ohlcSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: true,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

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
    if (!data || !ohlcSeriesRef.current) return;
    ohlcSeriesRef.current.setData(data);
  }, [data]);

  return (
    <>
      <div
        className="chart-container"
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid",
          borderColor: "var(--color-highlighted)",
        }}
      ></div>
    </>
  );
}
