/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DataPoint, MarketSummary, ViewPerspective, AlignmentMode, GraphMode } from './types/market';
import { fetchInitialMarketData, simulateMarketTick } from './services/marketService';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HeaderBar } from './components/HeaderBar';
import { ControlDock } from './components/ControlDock';
import { TooltipOverlay } from './components/TooltipOverlay';
import { ThreeSceneManager } from './three/ThreeScene';
import { setSoundMuted, isSoundMuted, playChime } from './utils/audio';

export default function App() {
  const [points, setPoints] = useState<DataPoint[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [source, setSource] = useState<'live_network' | 'simulated_live'>('simulated_live');

  // Animation & Playback state
  const [progress, setProgress] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // View & Graph state
  const [perspective, setPerspective] = useState<ViewPerspective>('isometric');
  const [alignment, setAlignment] = useState<AlignmentMode>('separated');
  const [graphMode, setGraphMode] = useState<GraphMode>('percentage');

  // Audio state
  const [isMuted, setIsMutedState] = useState(isSoundMuted());

  // Interactive Hover Inspection
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const sceneManagerRef = useRef<ThreeSceneManager | null>(null);

  // 1. Initial Load
  useEffect(() => {
    let isMounted = true;
    fetchInitialMarketData().then((state) => {
      if (!isMounted) return;
      setPoints(state.points);
      setSummary(state.summary);
      setSource(state.source);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Animated Timeline Playback Loop
  useEffect(() => {
    if (!isPlaying || points.length === 0) return;

    let lastTime = performance.now();
    let animId: number;

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Base: full day traverses in 18 seconds at 1x speed
      const rate = (1 / 18) * playbackSpeed;

      setProgress((prev) => {
        const next = prev + rate * dt;
        if (next >= 1.0) {
          setIsPlaying(false);
          playChime(true);
          return 1.0;
        }
        return next;
      });

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, points.length]);

  // 3. Live Streaming Micro-ticks (Every 3 seconds when at 100% progress)
  useEffect(() => {
    if (progress < 0.98 || points.length === 0 || !summary) return;

    const interval = setInterval(() => {
      const { updatedPoints, updatedSummary } = simulateMarketTick(points, summary);
      setPoints(updatedPoints);
      setSummary(updatedSummary);
    }, 3000);

    return () => clearInterval(interval);
  }, [progress, points, summary]);

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        sceneManagerRef.current?.resetCamera();
        setPerspective('isometric');
      } else if (e.key === '1') {
        setPerspective('isometric');
      } else if (e.key === '2') {
        setPerspective('head_to_head');
      } else if (e.key === '3') {
        setPerspective('chart_front');
      } else if (e.key === '4') {
        setPerspective('top_down');
      } else if (e.key === 'm' || e.key === 'M') {
        const nextMute = !isSoundMuted();
        setSoundMuted(nextMute);
        setIsMutedState(nextMute);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setSoundMuted(nextMute);
    setIsMutedState(nextMute);
  };

  const handleResetCamera = () => {
    sceneManagerRef.current?.resetCamera();
    setPerspective('isometric');
  };

  const handleSelectEvent = (minuteIndex: number) => {
    const newProgress = Math.max(0.02, minuteIndex / (points.length - 1));
    setProgress(newProgress);
    setIsPlaying(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050811] text-slate-100 select-none">
      {/* 3D WebGL Canvas Layer */}
      <ThreeCanvas
        points={points}
        progress={progress}
        alignment={alignment}
        perspective={perspective}
        graphMode={graphMode}
        sceneManagerRef={sceneManagerRef}
        onHoverPoint={(pt, x, y) => {
          setHoveredPoint(pt);
          setMousePos({ x, y });
        }}
      />

      {/* Top Header Bar HUD */}
      {summary && (
        <HeaderBar
          summary={summary}
          source={source}
          onResetCamera={handleResetCamera}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Floating Raycast Inspection Tooltip */}
      <TooltipOverlay point={hoveredPoint} position={mousePos} />

      {/* Consolidated Ergonomic Bottom Control Dock */}
      {summary && points.length > 0 && (
        <ControlDock
          progress={progress}
          onProgressChange={setProgress}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={setPlaybackSpeed}
          perspective={perspective}
          onChangePerspective={setPerspective}
          alignment={alignment}
          onChangeAlignment={setAlignment}
          summary={summary}
          points={points}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {/* Loading Skeleton */}
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050811] z-50">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-sky-400" />
            </div>
            <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
              Initializing 3D Market Space...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
