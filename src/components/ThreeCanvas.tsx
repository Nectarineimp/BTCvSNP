import React, { useEffect, useRef } from 'react';
import { ThreeSceneManager } from '../three/ThreeScene';
import { DataPoint, AlignmentMode, ViewPerspective, GraphMode } from '../types/market';

interface ThreeCanvasProps {
  points: DataPoint[];
  progress: number;
  alignment: AlignmentMode;
  perspective: ViewPerspective;
  graphMode: GraphMode;
  onHoverPoint: (point: DataPoint | null, clientX: number, clientY: number) => void;
  sceneManagerRef: React.MutableRefObject<ThreeSceneManager | null>;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  points,
  progress,
  alignment,
  perspective,
  graphMode,
  onHoverPoint,
  sceneManagerRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoverCallbackRef = useRef(onHoverPoint);
  hoverCallbackRef.current = onHoverPoint;

  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new ThreeSceneManager(mountRef.current, {
      onHoverPoint: (pt, x, y) => {
        hoverCallbackRef.current(pt, x, y);
      },
    });

    sceneManagerRef.current = manager;

    if (points.length > 0) {
      manager.setData(points);
      manager.setProgress(progress);
      manager.setAlignment(alignment);
      manager.setCameraPerspective(perspective);
    }

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Synchronize data changes without remounting
  useEffect(() => {
    if (sceneManagerRef.current && points.length > 0) {
      sceneManagerRef.current.setData(points);
    }
  }, [points]);

  // Synchronize progress
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setProgress(progress);
    }
  }, [progress]);

  // Synchronize alignment
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAlignment(alignment);
    }
  }, [alignment]);

  // Synchronize perspective
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraPerspective(perspective);
    }
  }, [perspective]);

  // Synchronize graphMode
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setGraphMode(graphMode);
    }
  }, [graphMode]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#050811]"
      style={{ touchAction: 'none' }}
    />
  );
};
