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
} from "@/types";
import { useCallback, useEffect, useRef } from "react";
import {
  ALL_INDICATOR_PERIODS,
  BOLLINGER_COLORS,
  BOLLINGER_MULTIPLIER,
  BOLLINGER_PERIOD,
  ChartIndicators,
  DEFAULT_INDICATORS,
  moverColor,
  moverLineWidth,
  sma,
  ema,
  bollingerBands,
} from "@/utils/indicators";

interface BaseChartProps {
  volumeData?: VolumeData[] | null;
  latestTick?: LiveTickerFeedMessage;
  frequency?: Frequency;
  indicators?: ChartIndicators;
  /**
   * Bars that overlap `priceData` but extend further back in time. They exist only to give
   * the moving averages enough history to produce their first value -- a `period`-length
   * average is null until it has `period` bars behind it, so on a short visible range there
   * is nothing to draw without them. Nothing from this series is plotted, see the indicator
   * effect below.
   */
  warmupData?: OHLCData[] | null;
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

// One line series per (family, period) across every frequency's period set, plus the three
// Bollinger bands. All of them are created when the chart is built and toggled with
// `visible`, so switching frequency never has to rebuild the chart.
type IndicatorSeriesName =
  | `sma${number}`
  | `ema${number}`
  | "bollingerMid"
  | "bollingerUpper"
  | "bollingerLower";

function indicatorSeriesNames(): IndicatorSeriesName[] {
  return [
    ...ALL_INDICATOR_PERIODS.map((period) => `sma${period}` as IndicatorSeriesName),
    ...ALL_INDICATOR_PERIODS.map((period) => `ema${period}` as IndicatorSeriesName),
    "bollingerMid",
    "bollingerUpper",
    "bollingerLower",
  ];
}

type IndicatorSeriesRegistry = Record<
  IndicatorSeriesName,
  ISeriesApi<"Line"> | null
>;

function emptyIndicatorSeries(): IndicatorSeriesRegistry {
  const registry = {} as IndicatorSeriesRegistry;
  for (const name of indicatorSeriesNames()) registry[name] = null;
  return registry;
}

// Series options are keyed by name and built once per chart: the colour ramps and the period
// catalogue live in @/utils/indicators so the settings menu and the chart cannot drift apart.
function buildIndicatorOptions(): Record<
  IndicatorSeriesName,
  DeepPartial<LineSeriesOptions>
> {
  const options = {} as Record<IndicatorSeriesName, DeepPartial<LineSeriesOptions>>;
  for (const period of ALL_INDICATOR_PERIODS) {
    options[`sma${period}`] = {
      color: moverColor("sma", period),
      lineWidth: moverLineWidth(period),
    };
    options[`ema${period}`] = {
      color: moverColor("ema", period),
      lineWidth: moverLineWidth(period),
    };
  }
  options.bollingerMid = { color: BOLLINGER_COLORS.mid, lineWidth: 1 };
  options.bollingerUpper = {
    color: BOLLINGER_COLORS.band,
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
  };
  options.bollingerLower = {
    color: BOLLINGER_COLORS.band,
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
  };
  return options;
}

function toChartTime(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

export default function StockChart(props: StockChartProps) {
  const {
    priceData,
    chartType,
    latestTick,
    frequency,
    indicators = DEFAULT_INDICATORS,
    warmupData = null,
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
  const indicatorSeriesRef = useRef<IndicatorSeriesRegistry>(emptyIndicatorSeries());

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

      const indicatorOptions = buildIndicatorOptions();

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
        indicatorSeriesRef.current = emptyIndicatorSeries();
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

      const visibleTimes = new Set<UTCTimestamp>(
        priceData.map((d) => toChartTime(d.time)),
      );
      // Warm-up bars sit to the left of the visible window and are never drawn themselves --
      // they only give the moving averages a full window to average over. Without them a
      // `period`-length average is null for the whole visible range whenever the range is
      // shorter than the period.
      const source =
        warmupData && warmupData.length > 0 ? warmupData : priceData;
      const sourceTimes = source.map((d) => toChartTime(d.time));
      const closes = source.map((d) => d.close);
      // Only plot points that land on a visible candle. Pushing the warm-up points too would
      // extend the line to the left of the first candle and show up the moment the user pans
      // back -- there is no price action there to average.

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
          if (value == null) return;
          const time = sourceTimes[i];
          if (!visibleTimes.has(time)) return;
          data.push({ time, value });
        });
        series.setData(data);
      };

      for (const period of ALL_INDICATOR_PERIODS) {
        const showSma = indicators.sma[period] === true;
        setIndicator(
          `sma${period}`,
          showSma ? sma(closes, period) : null,
          showSma,
        );
        const showEma = indicators.ema[period] === true;
        setIndicator(
          `ema${period}`,
          showEma ? ema(closes, period) : null,
          showEma,
        );
      }

      const showBollinger = indicators.bollinger === true;
      const bands = showBollinger
        ? bollingerBands(closes, BOLLINGER_PERIOD, BOLLINGER_MULTIPLIER)
        : null;
      setIndicator("bollingerMid", bands ? bands.middle : null, showBollinger);
      setIndicator("bollingerUpper", bands ? bands.upper : null, showBollinger);
      setIndicator("bollingerLower", bands ? bands.lower : null, showBollinger);
    } catch (error) {
      console.log(`Error updating indicator series:\n${error}`);
    }
  }, [priceData, warmupData, indicators]);

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
