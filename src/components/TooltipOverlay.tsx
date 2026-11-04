import React from 'react';
import { DataPoint } from '../types/market';
import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';

interface TooltipOverlayProps {
  point: DataPoint | null;
  position: { x: number; y: number };
}

export const TooltipOverlay: React.FC<TooltipOverlayProps> = ({ point, position }) => {
  if (!point) return null;

  const btcUp = point.btcChangePct >= 0;
  const spxUp = point.spxChangePct >= 0;
  const spread = point.spreadPct;
  const spreadBtcOutperforms = spread >= 0;

  // Keep tooltip on screen
  const x = Math.min(window.innerWidth - 280, Math.max(16, position.x - 140));
  const y = Math.max(70, position.y - 180);

  return (
    <div
      className="fixed z-30 pointer-events-none transition-all duration-75 ease-out select-none"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <div className="w-[280px] bg-[#090f20] border border-slate-600 rounded-xl p-3 shadow-2xl text-slate-100">
        {/* Header: Time & Annotation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">{point.time} EST</span>
          </div>
          {point.annotation ? (
            <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" />
              {point.annotation}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">Minute #{point.minuteIndex * 5}</span>
          )}
        </div>

        {/* Bitcoin Metric */}
        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Bitcoin (BTC)</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs font-bold text-slate-100">
              ${point.btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] font-mono font-semibold flex items-center justify-end ${btcUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {btcUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
              {btcUp ? '+' : ''}{point.btcChangePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* S&P 500 Metric */}
        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-xs text-slate-300 font-medium">S&amp;P 500 (SPX)</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs font-bold text-slate-100">
              {point.spxPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] font-mono font-semibold flex items-center justify-end ${spxUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {spxUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
              {spxUp ? '+' : ''}{point.spxChangePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Spread / Divergence */}
        <div className="flex items-center justify-between pt-2 text-[11px]">
          <span className="text-slate-400">Relative Alpha:</span>
          <span className={`font-mono font-bold ${spreadBtcOutperforms ? 'text-amber-400' : 'text-sky-400'}`}>
            {spreadBtcOutperforms ? 'BTC leads by +' : 'SPX leads by +'}
            {Math.abs(spread).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};
