import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  Sliders,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { ViewPerspective, AlignmentMode, MarketSummary, DataPoint } from '../types/market';
import { playScrubTick } from '../utils/audio';

interface ControlDockProps {
  progress: number;
  onProgressChange: (progress: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  perspective: ViewPerspective;
  onChangePerspective: (preset: ViewPerspective) => void;
  alignment: AlignmentMode;
  onChangeAlignment: (mode: AlignmentMode) => void;
  summary: MarketSummary;
  points: DataPoint[];
  onSelectEvent: (minuteIndex: number) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  progress,
  onProgressChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  perspective,
  onChangePerspective,
  alignment,
  onChangeAlignment,
  summary,
  points,
  onSelectEvent,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'playback' | 'camera' | 'analytics'>('playback');

  // Key event timestamps in points
  const eventPoints = React.useMemo(() => {
    return points.filter((p) => p.annotation);
  }, [points]);

  const currentPointIndex = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
  const currentPoint = points[currentPointIndex];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onProgressChange(val);
    playScrubTick(700 + val * 400);
  };

  return (
    <div
      className="fixed z-20 transition-transform duration-300 ease-in-out select-none"
      style={{
        bottom: '16px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isCollapsed ? 'calc(100% - 38px)' : '0'})`,
        width: 'min(940px, 94vw)',
      }}
    >
      {/* Collapse / Expand Toggle Button on Top Center */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-[#0b1329] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 border-b-0 rounded-t-lg px-4 py-1 text-xs font-medium flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
          title="Toggle Control Dock (Press H)"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="bg-[#090f22] border border-slate-700/90 rounded-2xl p-3 shadow-2xl text-slate-100">
        {/* Top Header inside Dock: Tab navigation & Quick Stats */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5 flex-wrap gap-2">
          {/* Tabs */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('playback')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'playback'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Timeline &amp; Race</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Camera &amp; View</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics &amp; Spread</span>
            </button>
          </div>

          {/* Quick Playhead Time badge */}
          {currentPoint && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Time:</span>
              <span className="font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                {currentPoint.time} EST
              </span>
              <span className="text-slate-400">Spread:</span>
              <span
                className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentPoint.spreadPct >= 0
                    ? 'text-amber-400 bg-amber-950/40'
                    : 'text-sky-400 bg-sky-950/40'
                }`}
              >
                {currentPoint.spreadPct >= 0 ? '+' : ''}
                {currentPoint.spreadPct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Tab 1: Timeline & Playback */}
        {activeTab === 'playback' && (
          <div className="space-y-2.5">
            {/* Scrubber Track */}
            <div className="relative pt-1">
              <input
                type="range"
                min="0.02"
                max="1.0"
                step="0.005"
                value={progress}
                onChange={handleSliderChange}
                aria-label="Timeline scrubber"
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 transition-all"
              />

              {/* Event Tick Marks below slider */}
              <div className="relative h-4 mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
                <span>09:30 Open</span>
                <span className="hidden sm:inline">11:00</span>
                <span>12:30 Midday</span>
                <span className="hidden sm:inline">14:00 FOMC</span>
                <span>16:00 Close</span>
              </div>
            </div>

            {/* Playback Controls & Key Events Jump Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
              {/* Play / Pause / Replay & Speed */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePlay}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play Today'}</span>
                </button>

                <button
                  onClick={() => onProgressChange(0.02)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Rewind to 09:30 AM Open"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Rewind</span>
                </button>

                {/* Speed Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onChangeSpeed(spd)}
                      className={`px-2 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-amber-500/30 text-amber-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Event Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Key Events:
                </span>
                {eventPoints.slice(0, 4).map((ep) => (
                  <button
                    key={ep.minuteIndex}
                    onClick={() => {
                      onSelectEvent(ep.minuteIndex);
                      playScrubTick(900);
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-white px-2 py-1 rounded-md transition-all cursor-pointer font-medium"
                  >
                    {ep.time} {ep.annotation?.split(' ')[1] || ep.annotation}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Camera & 3D View */}
        {activeTab === 'camera' && (
          <div className="flex items-center justify-between gap-4 flex-wrap py-1">
            {/* Camera Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400">Camera Angle:</span>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                {(
                  [
                    { id: 'isometric', label: 'Perspective 3D' },
                    { id: 'head_to_head', label: 'Chase Lead' },
                    { id: 'chart_front', label: 'Chart Profile' },
                    { id: 'top_down', label: 'Top-Down Radar' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => onChangePerspective(id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      perspective === id
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Track Alignment: Separated vs Overlay */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Track Layout:</span>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                <button
                  onClick={() => onChangeAlignment('separated')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                    alignment === 'separated'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>3D Dual Tracks</span>
                </button>
                <button
                  onClick={() => onChangeAlignment('superimposed')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                    alignment === 'superimposed'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Superimposed Race</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Macro Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Pearson Correlation (r)</div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                {summary.correlation > 0 ? '+' : ''}{summary.correlation.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {summary.correlation > 0.5 ? 'Strong Positive Co-movement' : 'Moderate Decoupling'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Crypto Beta (to SPX)</div>
              <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                {summary.beta.toFixed(2)}x
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                BTC moves {summary.beta.toFixed(1)}x per 1% SPX swing
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Volatility Ratio</div>
              <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                {summary.volatilityRatio.toFixed(1)}x
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                BTC standard deviation vs SPX
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Intraday Range (H / L)</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                BTC: ${(summary.btcHigh - summary.btcLow).toLocaleString()} spread
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                SPX: {(summary.spxHigh - summary.spxLow).toFixed(1)} pts spread
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
