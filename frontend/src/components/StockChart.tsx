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
import { useComputedColorScheme } from "@mantine/core";
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
import {
  CHART_COLOR_TOKENS,
  INDICATOR_COLOR_TOKENS,
  THEME_COLOR_TOKENS,
  getComputedColor,
} from "@/utils/colors";

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
    ...ALL_INDICATOR_PERIODS.map(
      (period) => `sma${period}` as IndicatorSeriesName,
    ),
    ...ALL_INDICATOR_PERIODS.map(
      (period) => `ema${period}` as IndicatorSeriesName,
    ),
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
  const options = {} as Record<
    IndicatorSeriesName,
    DeepPartial<LineSeriesOptions>
  >;
  // Resolved once here rather than per series: one getComputedStyle read per family.
  const smaBase = getComputedColor(INDICATOR_COLOR_TOKENS.sma);
  const emaBase = getComputedColor(INDICATOR_COLOR_TOKENS.ema);
  for (const period of ALL_INDICATOR_PERIODS) {
    options[`sma${period}`] = {
      color: moverColor(smaBase, period),
      lineWidth: moverLineWidth(period),
    };
    options[`ema${period}`] = {
      color: moverColor(emaBase, period),
      lineWidth: moverLineWidth(period),
    };
  }
  options.bollingerMid = {
    color: getComputedColor(INDICATOR_COLOR_TOKENS.bollingerMid),
    lineWidth: 1,
  };
  options.bollingerUpper = {
    color: getComputedColor(INDICATOR_COLOR_TOKENS.bollingerBand),
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
  };
  options.bollingerLower = {
    color: getComputedColor(INDICATOR_COLOR_TOKENS.bollingerBand),
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
  };
  return options;
}

function toChartTime(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

interface ChartOptionFlags {
  interactive: boolean;
  showHorizAxis: boolean;
  showVertAxis: boolean;
  showGrid: boolean;
  override: DeepPartial<ChartOptions> | null;
}

/**
 * The full chart configuration, rebuilt from tokens on demand.
 *
 * One function serves both creation and in-place updates, so a chart can never end up
 * configured differently from the way it was built -- `applyOptions` merge semantics for
 * nested `layout`/`grid` objects are not something to rely on when a partial update could
 * silently drop a key.
 *
 * `override` is spread last on purpose to override existing configs.
 * */
function buildChartOptions(flags: ChartOptionFlags): DeepPartial<ChartOptions> {
  const grid = getComputedColor(THEME_COLOR_TOKENS.grid);

  return {
    ...(!flags.interactive ? { handleScale: false, handleScroll: false } : {}),
    ...(!flags.showHorizAxis ? { timeScale: { visible: false } } : {}),
    ...(!flags.showVertAxis
      ? {
          rightPriceScale: { visible: false },
          leftPriceScale: { visible: false },
        }
      : {}),
    layout: {
      textColor: getComputedColor(THEME_COLOR_TOKENS.text),
      background: {
        type: ColorType.Solid,
        color: getComputedColor(THEME_COLOR_TOKENS.background),
      },
      attributionLogo: false,
      panes: {
        enableResize: true,
        separatorColor: grid,
      },
    },
    grid: flags.showGrid
      ? { vertLines: { color: grid }, horzLines: { color: grid } }
      : { horzLines: { visible: false }, vertLines: { visible: false } },
    ...(flags.override ?? {}),
  };
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
  const indicatorSeriesRef = useRef<IndicatorSeriesRegistry>(
    emptyIndicatorSeries(),
  );
  const colorScheme = useComputedColorScheme();

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

  const optionFlags: ChartOptionFlags = {
    interactive,
    showHorizAxis,
    showVertAxis,
    showGrid,
    override: chartOptionOverride,
  };

  //====================================================================================================
  //                                    EFFECT PIPELINE -- READ THIS FIRST
  //====================================================================================================
  //
  // These effects are an ordered pipeline sharing four refs, not independent steps:
  //
  //   1. build        creates the chart and every series. Deps: [chartType] ONLY.
  //   2. recolor      re-applies indicator line colors. Deps: [colorScheme].
  //   3. applyOptions reconfigures the live chart. Deps: theme + the option flags.
  //   4. data         pushes candles/volume and their colors. Deps: data + theme.
  //   5. indicators   computes and pushes indicator series. Deps: data + toggles.
  //   6. live tick    patches the newest bar. Deps: incoming tick.
  //   7. time axis    retargets the date formatter. Deps: [dateTickFormatter].
  //
  // The numbering is source order, and ORDER IS LOAD-BEARING: 1 must precede 2 and 3, which
  // must precede 4. React runs effects in declaration order, so do not reorder these.
  //
  // Why 1 is keyed on chartType alone: it is the only input that genuinely needs a NEW chart
  // (candle and area are different series types). Everything else -- including every themed
  // color -- is applied in place by 2 and 3. Keying construction on the serialized options
  // instead tore the whole chart down on a theme toggle, which discarded pan/zoom, wiped the
  // volume series, and left the indicator series rebuilt empty at `visible: false` with no
  // effect left to repopulate them (5 does not depend on the theme). They only came back when
  // a query refetch happened to hand `priceData` a new identity.

  // builds the chart and all series -- teardown is a full chart.remove()
  useEffect(() => {
    try {
      if (!chartContainerRef.current) return;
      const chart = createChart(
        chartContainerRef.current,
        buildChartOptions(optionFlags),
      );
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
      priceSeries
        .priceScale()
        .applyOptions(
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

      for (const name of Object.keys(
        indicatorSeriesRef.current,
      ) as IndicatorSeriesName[]) {
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
  }, [chartType]);

  // re-applies indicator line colors when the theme changes
  useEffect(() => {
    try {
      const options = buildIndicatorOptions();
      for (const name of Object.keys(
        indicatorSeriesRef.current,
      ) as IndicatorSeriesName[]) {
        const series = indicatorSeriesRef.current[name];
        if (!series) continue;
        series.applyOptions(options[name]);
      }
    } catch (error) {
      console.log(`Error applying indicator colors:\n${error}`);
    }
  }, [colorScheme]);

  // applies option changes to the live chart, without rebuilding it
  useEffect(() => {
    try {
      if (!chartRef.current) return;
      chartRef.current.applyOptions(buildChartOptions(optionFlags));
    } catch (error) {
      console.log(`Error applying chart options:\n${error}`);
    }
  }, [
    colorScheme,
    chartType,
    interactive,
    showHorizAxis,
    showVertAxis,
    showGrid,
    chartOptionOverride,
  ]);

  // sets chart data and applies color formatting
  useEffect(() => {
    try {
      if (!priceData || !priceSeriesRef.current) return;

      switch (chartType) {
        case "candle":
          priceSeriesRef.current.applyOptions({
            upColor: getComputedColor(CHART_COLOR_TOKENS.up),
            downColor: getComputedColor(CHART_COLOR_TOKENS.down),
            borderVisible: true,
            wickUpColor: getComputedColor(CHART_COLOR_TOKENS.up),
            wickDownColor: getComputedColor(CHART_COLOR_TOKENS.down),
          });
          break;
        case "area":
          const hasData = priceData && priceData.length > 0;
          const upChart = hasData
            ? priceData[0].value <= priceData[priceData.length - 1].value
            : true;
          const areaChartColors = {
            lineColor: getComputedColor(
              upChart ? CHART_COLOR_TOKENS.up : CHART_COLOR_TOKENS.down,
            ),
            topColor: getComputedColor(
              upChart ? CHART_COLOR_TOKENS.up : CHART_COLOR_TOKENS.down,
            ),
            bottomColor: getComputedColor(
              upChart ? CHART_COLOR_TOKENS.upFill : CHART_COLOR_TOKENS.downFill,
            ),
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
  }, [priceData, volumeData, colorScheme]);

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
      if (!latestTick || !priceSeriesRef.current || !frequency) return;

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
