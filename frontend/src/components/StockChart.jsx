import {
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  createChart,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

export default function StockChart({
  priceData,
  chartType,
  volumeData = null,
  containerStyles = { width: "100%", height: "100%" },
  chartOptionOverride = null,
}) {
  const chartContainerRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // need to start using Context API for themes
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-background-secondary")
    .trim();
  const separatorColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-chart-panes")
    .trim();

  let chartOptions;
  if (!chartOptionOverride) {
    chartOptions = {
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
    };
  } else {
    chartOptions = chartOptionOverride;
  }
  //    autoSize: true,
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, chartOptions);
    let priceSeries;
    switch (chartType) {
      case "candle": {
        priceSeries = chart.addSeries(CandlestickSeries, {
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
        const upChart =
          priceData &&
          priceData[0]?.value <= priceData[priceData.length - 1]?.value;
        areaChartColors = {
          lineColor: upChart ? "#26a69a" : "#ef5350",
          topColor: upChart ? "#26a69a" : "#ef5350",
          bottomColor: upChart
            ? "rgba(38, 166, 154, 0.28)"
            : "rgba(239, 83, 80, 0.28)",
        };
        priceSeries = chart.addSeries(AreaSeries, areaChartColors);
        break;
      }
    }
    priceSeriesRef.current = priceSeries;
    priceSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4,
      },
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });
    volumeSeriesRef.current = volumeSeries;
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    //    chart.timeScale().fitContent();

    const resizer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      let { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height: height - 30 });
    });

    resizer.observe(chartContainerRef.current);

    return () => {
      chart.remove();
      resizer.disconnect();
    };
  }, [priceData, volumeData]);

  useEffect(() => {
    try {
      if (!priceData || !priceSeriesRef.current) return;
      console.log(`Price data being set: ${JSON.stringify(priceData[1])}`);
      priceSeriesRef.current.setData(priceData);
      if (volumeData && volumeSeriesRef.current) {
        console.log(`Volume data being set: ${JSON.stringify(volumeData[1])}`);
        volumeSeriesRef.current.setData(volumeData);
      }
    } catch (error) {
      console.log(error);
    }
  }, [priceData, volumeData]);

  return (
    <div
      className="chart-container"
      ref={chartContainerRef}
      style={containerStyles}
    ></div>
  );
}
