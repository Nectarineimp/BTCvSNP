import { DataPoint, MarketSummary } from '../types/market';

/**
 * Generates high-fidelity intraday data points for today's trading session (09:30 to 16:00 EST).
 * Simulates real macro-correlated market dynamics between Bitcoin and the S&P 500 index.
 */
export function generateTodayMarketData(
  baseBtcPrice = 91250,
  baseSpxPrice = 5885,
  seedShift = 0
): { points: DataPoint[]; summary: MarketSummary } {
  const points: DataPoint[] = [];

  const startHour = 9;
  const startMinute = 30;
  const totalMinutes = 390; // 6.5 hours (09:30 to 16:00)
  const stepMinutes = 5;
  const numSteps = Math.floor(totalMinutes / stepMinutes) + 1; // 79 steps

  let currentBtc = baseBtcPrice;
  let currentSpx = baseSpxPrice;

  let btcHigh = baseBtcPrice;
  let btcLow = baseBtcPrice;
  let spxHigh = baseSpxPrice;
  let spxLow = baseSpxPrice;

  // Key event annotations
  const keyEvents: Record<number, string> = {
    0: '09:30 US Cash Market Open',
    6: '10:00 ISM Manufacturing Print',
    18: '11:00 European Market Close',
    42: '13:00 US 10-Year Bond Auction',
    54: '14:00 FOMC Minutes / Fed Speaker',
    72: '15:30 Power Hour Volume Surge',
    78: '16:00 NYSE Closing Bell'
  };

  // Seeded pseudo-random generator
  let state = 1234567 + seedShift;
  const rng = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  const todayDate = new Date();
  todayDate.setHours(9, 30, 0, 0);
  const startTimestamp = todayDate.getTime();

  for (let i = 0; i < numSteps; i++) {
    const elapsedMinutes = i * stepMinutes;
    const currentTimestamp = startTimestamp + elapsedMinutes * 60 * 1000;

    const hour = Math.floor((startMinute + elapsedMinutes) / 60) + startHour;
    const minute = (startMinute + elapsedMinutes) % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    if (i > 0) {
      // Macro market factor: common sentiment tide
      const macroShock = Math.sin((i / numSteps) * Math.PI * 2.5) * 0.0012 + (rng() - 0.49) * 0.0022;

      // SPX has lower volatility (~0.2% - 0.4% per hour)
      const spxReturn = macroShock * 0.9 + (rng() - 0.495) * 0.0012;
      currentSpx *= 1 + spxReturn;

      // BTC has higher beta (~2.5x - 3.8x SPX movement) + idiosyncratic crypto momentum
      const cryptoIdiosyncratic = (rng() - 0.485) * 0.0045;
      const btcReturn = macroShock * 2.8 + cryptoIdiosyncratic;
      currentBtc *= 1 + btcReturn;

      // Ensure realistic boundaries
      btcHigh = Math.max(btcHigh, currentBtc);
      btcLow = Math.min(btcLow, currentBtc);
      spxHigh = Math.max(spxHigh, currentSpx);
      spxLow = Math.min(spxLow, currentSpx);
    }

    const btcChangePct = ((currentBtc - baseBtcPrice) / baseBtcPrice) * 100;
    const spxChangePct = ((currentSpx - baseSpxPrice) / baseSpxPrice) * 100;
    const spreadPct = btcChangePct - spxChangePct;

    const volumeBtc = Math.round(150 + rng() * 650 + (i === 0 || i === numSteps - 1 ? 800 : 0));
    const volumeSpx = Math.round(8000 + rng() * 15000 + (i === 0 || i === numSteps - 1 ? 25000 : 0));

    points.push({
      time: timeStr,
      timestamp: currentTimestamp,
      minuteIndex: i,
      btcPrice: Math.round(currentBtc * 100) / 100,
      btcChangePct: Math.round(btcChangePct * 1000) / 1000,
      spxPrice: Math.round(currentSpx * 100) / 100,
      spxChangePct: Math.round(spxChangePct * 1000) / 1000,
      spreadPct: Math.round(spreadPct * 1000) / 1000,
      volumeBtc,
      volumeSpx,
      annotation: keyEvents[i]
    });
  }

  // Calculate Pearson correlation & Beta
  let sumBtc = 0;
  let sumSpx = 0;
  for (const pt of points) {
    sumBtc += pt.btcChangePct;
    sumSpx += pt.spxChangePct;
  }
  const meanBtc = sumBtc / points.length;
  const meanSpx = sumSpx / points.length;

  let covariance = 0;
  let varBtc = 0;
  let varSpx = 0;
  for (const pt of points) {
    const dBtc = pt.btcChangePct - meanBtc;
    const dSpx = pt.spxChangePct - meanSpx;
    covariance += dBtc * dSpx;
    varBtc += dBtc * dBtc;
    varSpx += dSpx * dSpx;
  }

  const stdBtc = Math.sqrt(varBtc / points.length);
  const stdSpx = Math.sqrt(varSpx / points.length);
  const correlation = stdBtc > 0 && stdSpx > 0 ? covariance / (Math.sqrt(varBtc) * Math.sqrt(varSpx)) : 0.65;
  const beta = varSpx > 0 ? covariance / varSpx : 2.8;
  const volatilityRatio = stdSpx > 0 ? stdBtc / stdSpx : 3.4;

  const lastPt = points[points.length - 1];

  const summary: MarketSummary = {
    btcCurrent: lastPt.btcPrice,
    btcOpen: baseBtcPrice,
    btcHigh: Math.round(btcHigh * 100) / 100,
    btcLow: Math.round(btcLow * 100) / 100,
    btcChange: Math.round((lastPt.btcPrice - baseBtcPrice) * 100) / 100,
    btcChangePct: lastPt.btcChangePct,
    spxCurrent: lastPt.spxPrice,
    spxOpen: baseSpxPrice,
    spxHigh: Math.round(spxHigh * 100) / 100,
    spxLow: Math.round(spxLow * 100) / 100,
    spxChange: Math.round((lastPt.spxPrice - baseSpxPrice) * 100) / 100,
    spxChangePct: lastPt.spxChangePct,
    correlation: Math.round(correlation * 100) / 100,
    volatilityRatio: Math.round(volatilityRatio * 10) / 10,
    beta: Math.round(beta * 100) / 100,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  return { points, summary };
}
