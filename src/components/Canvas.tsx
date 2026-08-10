'use client';

import React, { useRef, useEffect, useReducer } from 'react';
import { SimulationState, Vector2D } from '../types/simulation';
import { hardwareManager } from '../lib/dpcc/iot/HardwareManager';

const TERRAIN_BUILD = 4;

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

    const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.85);
    base.addColorStop(0, '#18181b');
    base.addColorStop(0.45, '#0f0f12');
    base.addColorStop(1, '#09090b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Range rings
    ctx.strokeStyle = 'rgba(63, 63, 70, 0.35)';
    ctx.lineWidth = 1;
    for (let r = 100; r < Math.max(width, height); r += 100) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(161, 161, 170, 0.4)';
        ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText(`${r}m`, cx + r + 5, cy - 6);
    }

    const spacing = 50;
    ctx.strokeStyle = 'rgba(63, 63, 70, 0.32)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    return offscreen;
}

function drawHudOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tick: number,
    sensorRange: number,
    energy: number,
    dronePos: Vector2D,
    targetPos: Vector2D,
    speed: number
) {
    const pad = 14;
    const arm = 22;
    const gold = 'rgba(52, 211, 153, 0.55)';
    const dim = 'rgba(113, 113, 122, 0.45)';

    ctx.save();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1;
    const corners: [number, number, number, number][] = [
        [pad, pad, 1, 1],
        [w - pad, pad, -1, 1],
        [pad, h - pad, 1, -1],
        [w - pad, h - pad, -1, -1],
    ];
    for (const [x0, y0, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x0, y0 + sy * arm);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x0 + sx * arm, y0);
        ctx.stroke();
    }

    ctx.strokeStyle = dim;
    ctx.setLineDash([3, 6]);
    ctx.strokeRect(pad + arm * 0.35, pad + arm * 0.35, w - (pad + arm * 0.35) * 2, h - (pad + arm * 0.35) * 2);
    ctx.setLineDash([]);

    // HUD Header Info
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
    ctx.fillText('DPCC HUD // HIL MULTI-PROCESSOR KERNEL', pad + arm + 6, pad + 14);
    ctx.fillStyle = 'rgba(161, 161, 170, 0.7)';
    ctx.fillText(`SENSOR RNG: ${sensorRange}m | VEL: ${speed.toFixed(2)} m/s`, pad + arm + 6, pad + 28);
    
    ctx.textAlign = 'right';
    ctx.fillText(`TICK T+${tick.toString().padStart(5, '0')}`, w - pad - arm - 6, pad + 14);
    ctx.fillStyle = energy > 25 ? 'rgba(45, 212, 191, 0.9)' : 'rgba(251, 113, 133, 0.95)';
    ctx.fillText(`LI-PO BAT ${energy.toFixed(1)}%`, w - pad - arm - 6, pad + 28);
    ctx.textAlign = 'left';

    // Live Actuator & PID Overlay Box (Bottom Left)
    const boxW = 240;
    const boxH = 65;
    const boxX = pad + arm;
    const boxY = h - pad - arm - boxH;

    ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
    ctx.strokeStyle = 'rgba(63, 63, 70, 0.8)';
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 9px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('⚡ CLOSED-LOOP PID ACTUATION & HARDWARE', boxX + 8, boxY + 14);

    const distToTarget = Math.hypot(targetPos.x - dronePos.x, targetPos.y - dronePos.y);
    const pwmVal = Math.min(255, Math.round(speed * 180));

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(`MOTOR PWM: ${pwmVal}/255`, boxX + 8, boxY + 28);
    ctx.fillText(`TARGET DIST: ${distToTarget.toFixed(1)}m`, boxX + 120, boxY + 28);

    ctx.fillText(`PID ERR: ${(distToTarget * 0.02).toFixed(3)}`, boxX + 8, boxY + 42);
    ctx.fillText(`HIL NODES: VIRTUAL/HW`, boxX + 120, boxY + 42);

    ctx.fillText(`POS: [${dronePos.x.toFixed(0)}, ${dronePos.y.toFixed(0)}]`, boxX + 8, boxY + 56);

    ctx.restore();
}

function drawTargetReticle(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
    ctx.save();
    ctx.translate(x, y);
    const rot = tick * 0.04;
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-rot);
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
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

        if (terrainCanvasRef.current) {
            ctx.drawImage(terrainCanvasRef.current, 0, 0, w, h);
        } else {
            ctx.fillStyle = '#18181b';
            ctx.fillRect(0, 0, w, h);
        }

        // Planned route
        missions.forEach((mission) => {
            if (mission.status !== 'active' || mission.waypoints.length < 2) return;
            ctx.save();
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            mission.waypoints.forEach((wp, idx) => {
                if (idx === 0) ctx.moveTo(wp.pos.x, wp.pos.y);
                else ctx.lineTo(wp.pos.x, wp.pos.y);
            });
            ctx.stroke();
            ctx.restore();
        });

        // Waypoints
        missions.forEach((mission) => {
            if (mission.status === 'active') {
                mission.waypoints.forEach((wp, idx) => {
                    const isReached = wp.reached;
                    const color = isReached ? '#34d399' : '#22d3ee';

                    ctx.save();
                    ctx.translate(wp.pos.x, wp.pos.y);

                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#e4e4e7';
                    ctx.font = 'bold 10px "JetBrains Mono", ui-monospace, monospace';
                    ctx.fillText(`WP-${idx + 1}`, 10, 4);
                    ctx.restore();
                });
            }
        });

        // Obstacles & LIDAR Rays
        obstacles.forEach((obs) => {
            const isDetected = detectedObstacles.includes(obs.id);
            const color = isDetected ? '#fb7185' : '#71717a';

            ctx.save();
            ctx.translate(obs.pos.x, obs.pos.y);

            ctx.fillStyle = isDetected ? 'rgba(251, 113, 133, 0.12)' : 'rgba(82, 82, 91, 0.12)';
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = isDetected ? 2 : 1.5;
            ctx.setLineDash(isDetected ? [] : [4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Draw LIDAR laser ray scanning lines from drone to detected obstacle
            if (isDetected) {
                ctx.save();
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 2]);
                ctx.beginPath();
                ctx.moveTo(drone.pos.x, drone.pos.y);
                ctx.lineTo(obs.pos.x, obs.pos.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw distance callout
                const midX = (drone.pos.x + obs.pos.x) / 2;
                const midY = (drone.pos.y + obs.pos.y) / 2;
                const dist = Math.hypot(obs.pos.x - drone.pos.x, obs.pos.y - drone.pos.y);
                ctx.fillStyle = '#fda4af';
                ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
                ctx.fillText(`LIDAR: ${dist.toFixed(0)}m`, midX, midY);
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
            smoothedAngleRef.current += delta * 0.1;
        }
        const angle = smoothedAngleRef.current;

        // Sensor Range Field
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, sensorRange, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([7, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Vector to target
        ctx.strokeStyle = 'rgba(161, 161, 170, 0.45)';
        ctx.lineWidth = 1.25;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flight Trail
        if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
                const t = i / trail.length;
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
                ctx.lineTo(trail[i].x, trail[i].y);
                ctx.strokeStyle = `rgba(45, 212, 191, ${0.1 + t * 0.38})`;
                ctx.lineWidth = 1 + t * 2.2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }

        // Render Drone Body
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.scale(1.4, 1.4);

        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();

        ctx.restore();

        // Render Drone Callout Tag (World Space)
        ctx.save();
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText('UAV-704 [DPCC NODE]', pos.x + 16, pos.y - 10);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText(`VEL: ${(speed * 10).toFixed(1)} km/h`, pos.x + 16, pos.y + 2);
        ctx.restore();

        drawHudOverlay(ctx, w, h, tick, sensorRange, drone.energy, pos, target, speed);
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
        <div className="relative h-full w-full min-h-0 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-800/90 shadow-[inset_0_0_80px_rgba(0,0,0,0.4),0_0_0_1px_rgba(39,39,42,0.7)]">
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
