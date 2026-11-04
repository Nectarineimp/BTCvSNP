import React from 'react';
import { MarketSummary } from '../types/market';
import { Volume2, VolumeX, RotateCcw, Maximize2, Minimize2, TrendingUp, TrendingDown } from 'lucide-react';
import { isSoundMuted, setSoundMuted } from '../utils/audio';

interface HeaderBarProps {
  summary: MarketSummary;
  source: 'live_network' | 'simulated_live';
  onResetCamera: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  summary,
  source,
  onResetCamera,
  isMuted,
  onToggleMute,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const btcUp = summary.btcChangePct >= 0;
  const spxUp = summary.spxChangePct >= 0;
  const spread = summary.btcChangePct - summary.spxChangePct;
  const spreadPositive = spread >= 0;

  return (
    <header className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-3">
      {/* Left: Branding & Real-time Financial Tickers */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Main Title Badge */}
        <div className="bg-[#0b1329] border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-slate-100 uppercase flex items-center gap-1.5">
              <span>BTC vs S&amp;P 500</span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                3D INTRADAY
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Today's Session</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{summary.lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Bitcoin Ticker Card */}
        <div className="bg-[#0b1329] border border-amber-500/40 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-bold text-amber-400 text-sm">
            ₿
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-amber-300 tracking-wider">Bitcoin</div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-slate-100">
                ${summary.btcCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold flex items-center ${
                  btcUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {btcUp ? <TrendingUp className="w-3 h-3 mr-0.5 inline" /> : <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
                {btcUp ? '+' : ''}
                {summary.btcChangePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* S&P 500 Ticker Card */}
        <div className="bg-[#0b1329] border border-sky-500/40 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-bold text-sky-400 text-xs">
            SPX
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-sky-300 tracking-wider">S&amp;P 500</div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-slate-100">
                {summary.spxCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold flex items-center ${
                  spxUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {spxUp ? <TrendingUp className="w-3 h-3 mr-0.5 inline" /> : <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
                {spxUp ? '+' : ''}
                {summary.spxChangePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Alpha Spread Indicator */}
        <div className="hidden md:flex bg-[#0b1329] border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-lg items-center gap-2">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Alpha Spread</div>
          <div className={`font-mono text-xs font-bold ${spreadPositive ? 'text-amber-400' : 'text-sky-400'}`}>
            {spreadPositive ? 'BTC +' : 'SPX +'}
            {Math.abs(spread).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Right: Telemetry & View Controls */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {/* Source Badge (clean static badge, no pulsating dots) */}
        <div className="bg-[#0b1329] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="hidden sm:inline font-medium text-slate-300">
            {source === 'live_network' ? 'Live Network' : 'Live Session'}
          </span>
        </div>

        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="bg-[#0b1329] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-lg transition-colors shadow-lg cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Reset Camera Button */}
        <button
          onClick={onResetCamera}
          aria-label="Reset Camera Angle"
          className="bg-[#0b1329] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-lg transition-colors shadow-lg flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Reset Camera Angle"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden md:inline">Reset View</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="bg-[#0b1329] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-lg transition-colors shadow-lg cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
