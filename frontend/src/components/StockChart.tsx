import {
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  createChart,
  ChartOptions,
  DeepPartial,
  ISeriesApi,
  UTCTimestamp,
  IChartApi,
  BusinessDay,
  TickMarkType,
  CandlestickData,
  Time,
  HistogramData,
} from "lightweight-charts";
import {
  OHLCData,
  VolumeData,
  PriceData,
  Frequency,
  OHLCVData,
} from "@shared/types";
import { useCallback, useEffect, useRef } from "react";
import { useComputedColorScheme } from "@mantine/core";

interface BaseChartProps {
  volumeData?: VolumeData[] | null;
  latestTick?: OHLCVData;
  frequency?: Frequency;
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

function toChartTime(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

export default function StockChart(props: StockChartProps) {
  const {
    priceData,
    chartType,
    latestTick,
    frequency,
    volumeData = null,
    containerStyles = { width: "100%", height: "100%" },
    chartOptionOverride = null,
    timeScale = true,
    interactive = true,
    showHorizAxis = true,
    showVertAxis = true,
    showGrid = true,
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Candlestick" | "Area">>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram">>(null);

  const dateTickFormatter = useCallback(
    (time: UTCTimestamp | BusinessDay) => {
      if (frequency !== "intraday" || typeof time !== "number") return null; // will do nothing, goes with Lightweight Charts default behavior.
      // for intraday frequency, custom format date axis with times.
      const d = new Date(time * 1000);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      return `${hh}:${mm}`;
    },
    [frequency],
  );

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
      chartRef.current = chart;

      let priceSeries: ISeriesApi<"Candlestick" | "Area">;

      switch (chartType) {
        case "candle": {
          priceSeries = chart.addSeries(CandlestickSeries);
          break;
        }
        case "area": {
          priceSeries = chart.addSeries(AreaSeries);
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
        chartRef.current = null;
        priceSeriesRef.current = null;
        volumeSeriesRef.current = null;
        resizer.disconnect();
      };
    } catch (error) {
      console.log(String(error));
    }
  }, [chartType, computedColorScheme, JSON.stringify(chartOptions)]);

  // sets chart data and applies color formatting
  useEffect(() => {
    try {
      if (!priceData || !priceSeriesRef.current) return;

      switch (chartType) {
        case "candle":
          priceSeriesRef.current.applyOptions({
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: true,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
          });
          break;
        case "area":
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
          priceSeriesRef.current.applyOptions(areaChartColors);
          break;
      }

      priceSeriesRef.current.setData(
        priceData.map((d) => ({ ...d, time: toChartTime(d.time) })),
      );
      if (volumeData && volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          volumeData.map((d) => ({ ...d, time: toChartTime(d.time) })),
        );
      }
    } catch (error) {
      console.log(String(error));
    }
  }, [priceData, volumeData]);

  // updates the chart with live bars
  useEffect(() => {
    if (!latestTick || !priceSeriesRef.current || !volumeSeriesRef.current)
      return;
    const transformedBar: CandlestickData<Time> = {
      ...latestTick, // lightweight-charts will ignore unnecessary fields
      time: toChartTime(latestTick.time),
    };
    priceSeriesRef.current.update(transformedBar);
    volumeSeriesRef.current.update({
      time: toChartTime(latestTick.time),
      value: latestTick.volume,
    });
  }, [JSON.stringify(latestTick)]);

  // sets date scale based on frequency
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        timeScale: {
          tickMarkFormatter: dateTickFormatter,
        },
      });
    }
  }, [dateTickFormatter]);
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
