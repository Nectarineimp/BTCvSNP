export interface DataPoint {
  time: string; // e.g. "09:30", "10:15"
  timestamp: number; // Unix timestamp in ms
  minuteIndex: number; // 0 to N
  btcPrice: number;
  btcChangePct: number; // % change since start of session
  spxPrice: number;
  spxChangePct: number; // % change since start of session
  spreadPct: number; // btcChangePct - spxChangePct
  volumeBtc: number;
  volumeSpx: number;
  annotation?: string; // e.g. "Market Open", "CPI Print", "Powell Remarks", "Power Hour"
}

export interface MarketSummary {
  btcCurrent: number;
  btcOpen: number;
  btcHigh: number;
  btcLow: number;
  btcChange: number;
  btcChangePct: number;
  spxCurrent: number;
  spxOpen: number;
  spxHigh: number;
  spxLow: number;
  spxChange: number;
  spxChangePct: number;
  correlation: number;
  volatilityRatio: number; // BTC vol / SPX vol
  beta: number;
  lastUpdated: string;
}

export type GraphMode = 'percentage' | 'normalized' | 'dual_axis';
export type ViewPerspective = 'isometric' | 'head_to_head' | 'chart_front' | 'top_down';
export type AlignmentMode = 'superimposed' | 'separated';
