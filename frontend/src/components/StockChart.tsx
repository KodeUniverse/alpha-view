import {
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  createChart,
  ChartOptions,
  DeepPartial,
  ISeriesApi,
} from "lightweight-charts";
import { OHLCData, VolumeData, PriceData } from "@shared/types";
import { useEffect, useRef } from "react";
import { useComputedColorScheme } from "@mantine/core";

interface BaseChartProps {
  volumeData?: VolumeData[] | null;
  containerStyles?: React.CSSProperties;
  chartOptionOverride?: DeepPartial<ChartOptions>;
  timeScale?: boolean;
  interactive?: boolean;
  showHorizAxis?: boolean;
  showVertAxis?: boolean;
  showGrid?: boolean;
}

interface CandleChartProps extends BaseChartProps {
  chartType: "candle";
  priceData: OHLCData[];
}

interface AreaChartProps extends BaseChartProps {
  chartType: "area";
  priceData: PriceData[];
}

type StockChartProps = CandleChartProps | AreaChartProps;

export default function StockChart({
  priceData,
  chartType,
  volumeData = null,
  containerStyles = { width: "100%", height: "100%" },
  chartOptionOverride = null,
  timeScale = true,
  interactive = true,
  showHorizAxis = true,
  showVertAxis = true,
  showGrid = true,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Candlestick" | "Area">>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram">>(null);

  const computedColorScheme = useComputedColorScheme();

  interface ComputedColorsCSS {
    backgroundPrimary?: string;
    backgroundSecondary?: string;
    chartGrid?: string;
    textPrimary?: string;
  }

  const cssVarMap: Record<string, keyof ComputedColorsCSS> = {
    "--color-background-primary": "backgroundPrimary",
    "--color-background-secondary": "backgroundSecondary",
    "--color-chart-grid": "chartGrid",
    "--color-text-primary": "textPrimary",
  };
  const cssVars: string[] = Object.keys(cssVarMap);
  const computedColors: ComputedColorsCSS = {};

  for (const cssVar of cssVars) {
    const property = cssVarMap[cssVar];
    if (property) {
      computedColors[property] = getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar)
        .trim();
    }
  }
  let chartOptionBuilder: DeepPartial<ChartOptions> = {
    layout: {
      textColor: computedColors.textPrimary,
      background: {
        type: ColorType.Solid,
        color: computedColors.backgroundSecondary,
      },
      attributionLogo: false,
      panes: {
        enableResize: true,
        separatorColor: computedColors.chartGrid,
      },
    },
    grid: {
      vertLines: {
        color: computedColors.chartGrid,
      },
      horzLines: {
        color: computedColors.chartGrid,
      },
    },
    ...chartOptionOverride,
  };

  !interactive
    ? (chartOptionBuilder = {
        handleScale: false,
        handleScroll: false,
        ...chartOptionBuilder,
      })
    : null;
  !showHorizAxis
    ? (chartOptionBuilder = {
        timeScale: { visible: false },
        ...chartOptionBuilder,
      })
    : null;
  !showVertAxis
    ? (chartOptionBuilder = {
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        ...chartOptionBuilder,
      })
    : null;
  !showGrid
    ? (chartOptionBuilder = {
        grid: { horzLines: { visible: false }, vertLines: { visible: false } },
        ...chartOptionBuilder,
      })
    : null;
  const chartOptions = chartOptionBuilder;

  useEffect(() => {
    try {
      if (!chartContainerRef.current) return;
      const chart = createChart(chartContainerRef.current, chartOptions);
      let priceSeries: ISeriesApi<"Candlestick" | "Area">;

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
          const hasData = priceData && priceData.length > 0;
          const upChart = hasData
            ? priceData[0].value <= priceData[priceData.length - 1].value
            : true;
          const areaChartColors = {
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

      if (timeScale) chart.timeScale().fitContent();

      const resizer = new ResizeObserver((entries) => {
        if (!entries.length) return;
        const rect = entries[0].target.getBoundingClientRect();
        const { width, height } = rect;
        chart.applyOptions({ width, height });
      });

      resizer.observe(chartContainerRef.current);

      return () => {
        chart.remove();
        resizer.disconnect();
      };
    } catch (error) {
      console.log(String(error));
    }
  }, [priceData, volumeData, chartType, timeScale, computedColorScheme]);

  useEffect(() => {
    try {
      if (!priceData || !priceSeriesRef.current) return;
      priceSeriesRef.current.setData(priceData);
      if (volumeData && volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData);
      }
    } catch (error) {
      console.log(String(error));
    }
  }, [priceData, volumeData, computedColorScheme]);

  return (
    <div
      className="chart-container"
      ref={chartContainerRef}
      style={{
        ...containerStyles,
        position: "relative",
        overflow: "hidden",
      }}
    ></div>
  );
}
