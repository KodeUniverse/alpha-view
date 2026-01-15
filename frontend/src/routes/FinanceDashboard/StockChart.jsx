import { AreaSeries, ColorType, createChart } from "lightweight-charts";
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
export default function StockChart() {
  return <div>This is chart.</div>;
}
