'use client';

import React, { useRef, useEffect, useReducer } from 'react';
import { SimulationState, Vector2D } from '../types/simulation';

const TERRAIN_BUILD = 6;

interface CanvasProps {
  stateRef: React.MutableRefObject<SimulationState>;
  sensorRange: number;
  onCanvasClick: (pos: Vector2D, rightClick?: boolean, shiftClick?: boolean) => void;
  tick: number;
}

function generateTerrain(width: number, height: number) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return offscreen;

  const cx = width / 2;
  const cy = height / 2;

  // Ultra-deep dark obsidian background
  const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.9);
  base.addColorStop(0, '#06070a');
  base.addColorStop(0.5, '#030406');
  base.addColorStop(1, '#010203');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Concentric Radar Rings
  ctx.strokeStyle = 'rgba(39, 39, 42, 0.5)';
  ctx.lineWidth = 1;
  for (let r = 80; r < Math.max(width, height); r += 80) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(113, 113, 122, 0.45)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`${r}m`, cx + r + 6, cy - 4);
  }

  // Crosshair Axes
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
  ctx.moveTo(0, cy); ctx.lineTo(width, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sub-grid lines
  const spacing = 40;
  ctx.strokeStyle = 'rgba(39, 39, 42, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x, 0); ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y); ctx.lineTo(width, y);
  }
  ctx.stroke();

  return offscreen;
}

function drawTargetReticle(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  ctx.save();
  ctx.translate(x, y);
  const rot = tick * 0.025;
  ctx.rotate(rot);

  // Outer ring
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner crosshair
  ctx.rotate(-rot * 2);
  ctx.strokeStyle = 'rgba(236, 72, 153, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
  ctx.moveTo(0, -12); ctx.lineTo(0, 12);
  ctx.stroke();

  // Glow core
  ctx.fillStyle = 'rgba(236, 72, 153, 0.6)';
  ctx.shadowColor = 'rgba(236, 72, 153, 0.9)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.restore();
}

const Canvas: React.FC<CanvasProps> = ({ stateRef, sensorRange, onCanvasClick, tick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terrainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedAngleRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const terrainBuildApplied = useRef<number>(0);
  const [, bumpResize] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const wrap = canvasRef.current?.parentElement;
    if (!wrap) return;
    const ro = new ResizeObserver(() => bumpResize());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    const sizeChanged = sizeRef.current.w !== w || sizeRef.current.h !== h;
    const terrainStale = terrainBuildApplied.current !== TERRAIN_BUILD;
    if (sizeChanged || terrainStale) {
      sizeRef.current = { w, h };
      terrainBuildApplied.current = TERRAIN_BUILD;
      terrainCanvasRef.current = generateTerrain(w, h);
    }

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { drone, obstacles, target, detectedObstacles, missions } = stateRef.current;

    // Draw background terrain
    if (terrainCanvasRef.current) {
      ctx.drawImage(terrainCanvasRef.current, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#06070a';
      ctx.fillRect(0, 0, w, h);
    }

    // Rotating Radar Sweep Beam Effect
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const sweepAngle = (tick * 0.03) % (Math.PI * 2);
    const grad = ctx.createConicGradient(sweepAngle, cx, cy);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
    grad.addColorStop(0.1, 'rgba(16, 185, 129, 0.02)');
    grad.addColorStop(0.25, 'transparent');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(w, h), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Planned Vector Route
    missions.forEach((mission) => {
      if (mission.status !== 'active' || mission.waypoints.length < 2) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      mission.waypoints.forEach((wp, idx) => {
        if (idx === 0) ctx.moveTo(wp.pos.x, wp.pos.y);
        else ctx.lineTo(wp.pos.x, wp.pos.y);
      });
      ctx.stroke();
      ctx.restore();
    });

    // Waypoint Markers
    missions.forEach((mission) => {
      if (mission.status === 'active') {
        mission.waypoints.forEach((wp, idx) => {
          const isReached = wp.reached;
          const color = isReached ? '#10b981' : '#06b6d4';

          ctx.save();
          ctx.translate(wp.pos.x, wp.pos.y);

          // Glowing aura
          ctx.fillStyle = isReached ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)';
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#f4f4f5';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(`WP-${idx + 1}`, 12, 3);
          ctx.restore();
        });
      }
    });

    // Obstacles & LIDAR Scanning Laser Rays
    obstacles.forEach((obs) => {
      const isDetected = detectedObstacles.includes(obs.id);
      const color = isDetected ? '#f43f5e' : '#52525b';

      ctx.save();
      ctx.translate(obs.pos.x, obs.pos.y);

      ctx.fillStyle = isDetected ? 'rgba(244, 63, 94, 0.12)' : 'rgba(39, 39, 42, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = isDetected ? 1.5 : 1;
      ctx.setLineDash(isDetected ? [] : [4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Laser Ray beam
      if (isDetected) {
        ctx.save();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(drone.pos.x, drone.pos.y);
        ctx.lineTo(obs.pos.x, obs.pos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const midX = (drone.pos.x + obs.pos.x) / 2;
        const midY = (drone.pos.y + obs.pos.y) / 2;
        const dist = Math.hypot(obs.pos.x - drone.pos.x, obs.pos.y - drone.pos.y);
        ctx.fillStyle = '#fda4af';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`LIDAR ${dist.toFixed(0)}m`, midX + 4, midY - 4);
        ctx.restore();
      }
    });

    drawTargetReticle(ctx, target.x, target.y, tick);

    const { pos, trail, velocity } = drone;
    const rawAngle = Math.atan2(velocity.y, velocity.x);
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed > 0.05) {
      let delta = rawAngle - smoothedAngleRef.current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      smoothedAngleRef.current += delta * 0.12;
    }
    const angle = smoothedAngleRef.current;

    // Sensor Field Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, sensorRange, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Line to Target
    ctx.strokeStyle = 'rgba(161, 161, 170, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing Flight Trail
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const t = i / trail.length;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.08 + t * 0.45})`;
        ctx.lineWidth = 1 + t * 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // Drone Aircraft Symbol with Neon Glow
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    ctx.fillStyle = '#10b981';
    ctx.shadowColor = 'rgba(16, 185, 129, 0.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.restore();

    // Callout Tag
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('UAV-704', pos.x + 15, pos.y - 6);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${(speed * 12).toFixed(1)} km/h`, pos.x + 15, pos.y + 5);
    ctx.restore();
  }, [stateRef, tick, sensorRange, bumpResize]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    onCanvasClick(pos, false, e.shiftKey);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    onCanvasClick(pos, true);
  };

  return (
    <div className="relative h-full w-full min-h-0 overflow-hidden rounded-xl bg-black ring-1 ring-zinc-800/80 shadow-2xl">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-crosshair"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

export default Canvas;
