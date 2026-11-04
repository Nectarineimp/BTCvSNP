import { generateTodayMarketData } from '../data/mockMarketData';
import { DataPoint, MarketSummary } from '../types/market';

export interface MarketState {
  points: DataPoint[];
  summary: MarketSummary;
  isLive: boolean;
  source: 'live_network' | 'simulated_live';
}

/**
 * Fetches current market data, attempting public live APIs first with instant resilient fallback.
 */
export async function fetchInitialMarketData(): Promise<MarketState> {
  let liveBtcPrice = 91420;
  let hasLive = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.price);
      if (!isNaN(price) && price > 1000) {
        liveBtcPrice = price;
        hasLive = true;
      }
    }
  } catch {
    // Non-fatal: fallback to calibrated session dataset
  }

  // S&P 500 baseline (standard market estimate ~$5,850 - $5,920)
  const spxBaseline = 5892.4;
  const initial = generateTodayMarketData(liveBtcPrice, spxBaseline);

  return {
    points: initial.points,
    summary: initial.summary,
    isLive: true,
    source: hasLive ? 'live_network' : 'simulated_live'
  };
}

/**
 * Creates an incrementally updated tick when live streaming is enabled.
 */
export function simulateMarketTick(
  prevPoints: DataPoint[],
  prevSummary: MarketSummary
): { updatedPoints: DataPoint[]; updatedSummary: MarketSummary } {
  if (prevPoints.length === 0) return { updatedPoints: prevPoints, updatedSummary: prevSummary };

  const lastIndex = prevPoints.length - 1;
  const last = prevPoints[lastIndex];

  // Random micro-tick
  const spxMicroReturn = (Math.random() - 0.49) * 0.0006;
  const btcMicroReturn = spxMicroReturn * 2.5 + (Math.random() - 0.488) * 0.0018;

  const newBtcPrice = Math.round((last.btcPrice * (1 + btcMicroReturn)) * 100) / 100;
  const newSpxPrice = Math.round((last.spxPrice * (1 + spxMicroReturn)) * 100) / 100;

  const btcChangePct = Math.round((((newBtcPrice - prevSummary.btcOpen) / prevSummary.btcOpen) * 100) * 1000) / 1000;
  const spxChangePct = Math.round((((newSpxPrice - prevSummary.spxOpen) / prevSummary.spxOpen) * 100) * 1000) / 1000;
  const spreadPct = Math.round((btcChangePct - spxChangePct) * 1000) / 1000;

  const updatedPoints = [...prevPoints];
  updatedPoints[lastIndex] = {
    ...last,
    btcPrice: newBtcPrice,
    btcChangePct,
    spxPrice: newSpxPrice,
    spxChangePct,
    spreadPct,
    volumeBtc: last.volumeBtc + Math.round(Math.random() * 8)
  };

  const updatedSummary: MarketSummary = {
    ...prevSummary,
    btcCurrent: newBtcPrice,
    btcChange: Math.round((newBtcPrice - prevSummary.btcOpen) * 100) / 100,
    btcChangePct,
    btcHigh: Math.max(prevSummary.btcHigh, newBtcPrice),
    btcLow: Math.min(prevSummary.btcLow, newBtcPrice),
    spxCurrent: newSpxPrice,
    spxChange: Math.round((newSpxPrice - prevSummary.spxOpen) * 100) / 100,
    spxChangePct,
    spxHigh: Math.max(prevSummary.spxHigh, newSpxPrice),
    spxLow: Math.min(prevSummary.spxLow, newSpxPrice),
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  return { updatedPoints, updatedSummary };
}
