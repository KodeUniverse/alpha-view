import {
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  createChart,
  ChartOptions,
  DeepPartial,
  ISeriesApi,
  UTCTimestamp,
  IChartApi,
  BusinessDay,
  CandlestickData,
  HistogramData,
  LineData,
  LineStyle,
  LineSeriesOptions,
  Time,
} from "lightweight-charts";
import {
  OHLCData,
  VolumeData,
  PriceData,
  Frequency,
  LiveTickerFeedMessage,
} from "@shared/types";
import { useCallback, useEffect, useRef } from "react";
import { sma, ema, bollingerBands } from "@/utils/indicators";

interface ChartIndicators {
  sma?: boolean;
  ema?: boolean;
  bollinger?: boolean;
}

interface BaseChartProps {
  volumeData?: VolumeData[] | null;
  latestTick?: LiveTickerFeedMessage;
  frequency?: Frequency;
  indicators?: ChartIndicators;
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

type IndicatorSeriesName = "sma" | "ema" | "bollingerMid" | "bollingerUpper" | "bollingerLower";

function toChartTime(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

export default function StockChart(props: StockChartProps) {
  const {
    priceData,
    chartType,
    latestTick,
    frequency,
    indicators = {},
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
  const indicatorSeriesRef = useRef<Record<IndicatorSeriesName, ISeriesApi<"Line"> | null>>({
    sma: null,
    ema: null,
    bollingerMid: null,
    bollingerUpper: null,
    bollingerLower: null,
  });

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

  interface ComputedColorsCSS {
    backgroundPrimary?: string;
    backgroundSecondary?: string;
    chartGrid?: string;
    textPrimary?: string;
  }

  const computedColors: ComputedColorsCSS = {};

  const cssVarMap: Record<string, keyof ComputedColorsCSS> = {
    "--color-background-primary": "backgroundPrimary",
    "--color-background-secondary": "backgroundSecondary",
    "--color-chart-grid": "chartGrid",
    "--color-text-primary": "textPrimary",
  };
  const cssVars: string[] = Object.keys(cssVarMap);

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

  if (!interactive) {
    chartOptionBuilder = {
      handleScale: false,
      handleScroll: false,
      ...chartOptionBuilder,
    };
  }
  if (!showHorizAxis) {
    chartOptionBuilder = {
      timeScale: { visible: false },
      ...chartOptionBuilder,
    };
  }
  if (!showVertAxis) {
    chartOptionBuilder = {
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      ...chartOptionBuilder,
    };
  }
  if (!showGrid) {
    chartOptionBuilder = {
      grid: { horzLines: { visible: false }, vertLines: { visible: false } },
      ...chartOptionBuilder,
    };
  }
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
      priceSeries.priceScale().applyOptions(
        chartType === "area"
          ? { scaleMargins: { top: 0.05, bottom: 0.05 } }
          : { scaleMargins: { top: 0.1, bottom: 0.4 } },
      );

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

      const indicatorOptions: Record<IndicatorSeriesName, DeepPartial<LineSeriesOptions>> = {
        sma: { color: "#f0b90b", lineWidth: 2 },
        ema: { color: "#3b82f6", lineWidth: 2 },
        bollingerMid: { color: "rgba(225, 32, 102, 0.85)", lineWidth: 1 },
        bollingerUpper: {
          color: "rgba(225, 32, 102, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
        },
        bollingerLower: {
          color: "rgba(225, 32, 102, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
        },
      };

      const defaultLine = {
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
      };

      for (const name of Object.keys(indicatorSeriesRef.current) as IndicatorSeriesName[]) {
        indicatorSeriesRef.current[name] = chart.addSeries(LineSeries, {
          ...defaultLine,
          ...indicatorOptions[name],
        });
      }

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
        indicatorSeriesRef.current = {
          sma: null,
          ema: null,
          bollingerMid: null,
          bollingerUpper: null,
          bollingerLower: null,
        };
        resizer.disconnect();
      };
    } catch (error) {
      console.log(String(error));
    }
  }, [chartType, JSON.stringify(chartOptions)]);

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
  }, [priceData, volumeData, computedColors]);

  // sets indicator series data and visibility
  useEffect(() => {
    try {
      if (!priceData || priceData.length === 0) return;

      const times = priceData.map((d) => toChartTime(d.time));
      const closes = priceData.map((d) => d.close);

      const setIndicator = (
        name: IndicatorSeriesName,
        values: (number | null)[] | null,
        visible: boolean,
      ) => {
        const series = indicatorSeriesRef.current[name];
        if (!series) return;
        series.applyOptions({ visible });
        if (!visible || !values) {
          series.setData([]);
          return;
        }
        const data: LineData<Time>[] = [];
        values.forEach((value, i) => {
          if (value != null) data.push({ time: times[i], value });
        });
        series.setData(data);
      };

      const showSma = indicators.sma === true;
      const showEma = indicators.ema === true;
      const showBollinger = indicators.bollinger === true;

      setIndicator("sma", showSma ? sma(closes, 20) : null, showSma);
      setIndicator("ema", showEma ? ema(closes, 20) : null, showEma);
      const bands = showBollinger ? bollingerBands(closes, 20, 2) : null;
      setIndicator("bollingerMid", bands ? bands.middle : null, showBollinger);
      setIndicator("bollingerUpper", bands ? bands.upper : null, showBollinger);
      setIndicator("bollingerLower", bands ? bands.lower : null, showBollinger);
    } catch (error) {
      console.log(`Error updating indicator series:\n${error}`);
    }
  }, [priceData, indicators.sma, indicators.ema, indicators.bollinger]);

  // updates the chart with live bars
  useEffect(() => {
    try {
      if (
        !latestTick ||
        !priceSeriesRef.current ||
        !frequency
      )
        return;

      let transformedBar: CandlestickData<Time> | LineData<Time>;
      let volumeBar: HistogramData<Time> | null = null;

      if (frequency === "intraday") {
        if (!latestTick.minuteBar) return;
        const time = toChartTime(latestTick.minuteBar.time);
        transformedBar =
          chartType === "area"
            ? { time, value: latestTick.minuteBar.close }
            : {
                ...latestTick.minuteBar, // lightweight-charts will ignore unnecessary fields
                time,
              };
        volumeBar = {
          time,
          value: latestTick.minuteBar.volume,
        };
      } else if (frequency === "daily") {
        if (!latestTick.dailyBar) return;
        const pinnedDate = new Date(
          latestTick.dailyBar.time.getFullYear(),
          latestTick.dailyBar.time.getMonth(),
          latestTick.dailyBar.time.getDate(),
        );
        const time = toChartTime(pinnedDate);
        transformedBar =
          chartType === "area"
            ? { time, value: latestTick.dailyBar.close }
            : {
                ...latestTick.dailyBar,
                time,
              };
        volumeBar = {
          time,
          value: latestTick.dailyBar.volume,
        };
      }

      priceSeriesRef.current.update(transformedBar);
      if (volumeData && volumeSeriesRef.current && volumeBar) {
        volumeSeriesRef.current.update(volumeBar);
      }
    } catch (error) {
      console.log(`Error updating chart series with live data:\n${error}`);
    }
  }, [JSON.stringify(latestTick), frequency, chartType, volumeData]);

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
