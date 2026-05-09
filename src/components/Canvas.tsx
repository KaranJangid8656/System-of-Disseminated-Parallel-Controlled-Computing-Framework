'use client';

import React, { useRef, useEffect, useReducer } from 'react';
import { SimulationState, Vector2D } from '../types/simulation';

/** Increment when `generateTerrain` palette changes so cached bitmap is rebuilt. */
const TERRAIN_BUILD = 3;

interface CanvasProps {
    stateRef: React.MutableRefObject<SimulationState>;
    sensorRange: number;
    onCanvasClick: (pos: Vector2D, rightClick?: boolean, shiftClick?: boolean) => void;
    tick: number;
}

/** Cached tactical backdrop (logical pixels). */
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

    // Major range rings
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

    // Minor rings (50m) — faint
    ctx.strokeStyle = 'rgba(82, 82, 91, 0.14)';
    for (let r = 50; r < Math.max(width, height); r += 100) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
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

    // Axis guides
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.12)';
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Waypoint-scale nodes on major grid
    ctx.fillStyle = 'rgba(52, 211, 153, 0.1)';
    for (let x = 0; x <= width; x += spacing * 2) {
        for (let y = 0; y <= height; y += spacing * 2) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Fine scan-line texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
    for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
    }

    const vGrad = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.12, cx, cy, Math.max(width, height) * 0.72);
    vGrad.addColorStop(0, 'rgba(9, 9, 11, 0)');
    vGrad.addColorStop(1, 'rgba(9, 9, 11, 0.9)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);

    return offscreen;
}

function drawHudOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tick: number,
    sensorRange: number,
    energy: number,
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

    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(228, 228, 231, 0.55)';
    ctx.fillText('TAC-MAP // UAV-704', pad + arm + 6, pad + 12);
    ctx.fillStyle = 'rgba(161, 161, 170, 0.5)';
    ctx.fillText(`RNG ${sensorRange}m`, pad + arm + 6, pad + 24);
    ctx.textAlign = 'right';
    ctx.fillText(`T+${tick.toString().padStart(5, '0')}`, w - pad - arm - 6, pad + 12);
    ctx.fillStyle = energy > 25 ? 'rgba(45, 212, 191, 0.65)' : 'rgba(251, 113, 133, 0.75)';
    ctx.fillText(`BAT ${energy.toFixed(0)}%`, w - pad - arm - 6, pad + 24);
    ctx.textAlign = 'left';

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

        // Planned route (active mission) — connect waypoints in order
        missions.forEach((mission) => {
            if (mission.status !== 'active' || mission.waypoints.length < 2) return;
            ctx.save();
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            mission.waypoints.forEach((wp, i) => {
                if (i === 0) ctx.moveTo(wp.pos.x, wp.pos.y);
                else ctx.lineTo(wp.pos.x, wp.pos.y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        });

        missions.forEach((mission) => {
            if (mission.status === 'active') {
                mission.waypoints.forEach((wp, idx) => {
                    const isReached = wp.reached;
                    const color = isReached ? '#34d399' : '#22d3ee';

                    ctx.save();
                    ctx.translate(wp.pos.x, wp.pos.y);

                    ctx.fillStyle = color;
                    ctx.globalAlpha = isReached ? 0.9 : 1;
                    ctx.beginPath();
                    ctx.moveTo(0, -5);
                    ctx.lineTo(5, 0);
                    ctx.lineTo(0, 5);
                    ctx.lineTo(-5, 0);
                    ctx.closePath();
                    ctx.fill();

                    ctx.globalAlpha = 0.45;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1.25;
                    ctx.beginPath();
                    ctx.arc(0, 0, 11, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#e4e4e7';
                    ctx.font = 'bold 10px "JetBrains Mono", ui-monospace, monospace';
                    ctx.fillText(`WP-${idx + 1}`, 14, 4);
                    ctx.restore();
                });
            }
        });

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

            ctx.fillStyle = isDetected ? '#fecdd3' : '#a1a1aa';
            ctx.font = '9px ui-sans-serif, system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(
                isDetected ? `OBST ${Math.round(obs.radius)}m` : 'UNKNOWN',
                0,
                obs.radius + 14,
            );
            ctx.textAlign = 'left';
            ctx.restore();
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

        // Sensor footprint
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

        const rotorSpin = tick * 0.65;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.scale(1.4, 1.4);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 5;
        ctx.shadowOffsetX = -1;

        const armGrad1 = ctx.createLinearGradient(-10, -10, 10, 10);
        armGrad1.addColorStop(0, '#27272a');
        armGrad1.addColorStop(0.5, '#71717a');
        armGrad1.addColorStop(1, '#27272a');

        const armGrad2 = ctx.createLinearGradient(-10, 10, 10, -10);
        armGrad2.addColorStop(0, '#27272a');
        armGrad2.addColorStop(0.5, '#71717a');
        armGrad2.addColorStop(1, '#27272a');

        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = armGrad1;
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(10, 10);
        ctx.stroke();
        ctx.strokeStyle = armGrad2;
        ctx.beginPath();
        ctx.moveTo(-10, 10);
        ctx.lineTo(10, -10);
        ctx.stroke();

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.moveTo(7, 7);
        ctx.lineTo(9, 9);
        ctx.moveTo(7, -7);
        ctx.lineTo(9, -9);
        ctx.stroke();

        const drawRealisticRotor = (rx: number, ry: number, dir: number) => {
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(rx, ry - 6.5);
            ctx.lineTo(rx, ry + 6.5);
            ctx.moveTo(rx - 6.5, ry);
            ctx.lineTo(rx + 6.5, ry);
            ctx.stroke();

            const ringGrad = ctx.createLinearGradient(rx - 6.5, ry - 6.5, rx + 6.5, ry + 6.5);
            ringGrad.addColorStop(0, '#71717a');
            ringGrad.addColorStop(1, '#e4e4e7');
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(rx, ry, 6.5, 0, Math.PI * 2);
            ctx.stroke();

            const motorGrad = ctx.createRadialGradient(rx, ry, 0.5, rx, ry, 3.5);
            motorGrad.addColorStop(0, '#d4d4d8');
            motorGrad.addColorStop(1, '#18181b');
            ctx.fillStyle = motorGrad;
            ctx.beginPath();
            ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(rotorSpin * dir);
            ctx.fillStyle = 'rgba(207, 250, 254, 0.5)';
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, 0, Math.PI / 2.4);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.fillStyle = 'rgba(165, 243, 252, 0.28)';
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, Math.PI, Math.PI + Math.PI / 2.4);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.arc(rx, ry, 1, 0, Math.PI * 2);
            ctx.fill();
        };

        drawRealisticRotor(11, -11, 1);
        drawRealisticRotor(11, 11, -1);
        drawRealisticRotor(-11, -11, -1);
        drawRealisticRotor(-11, 11, 1);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(6, -6);
        ctx.lineTo(-8, -5);
        ctx.lineTo(-12, -2);
        ctx.lineTo(-12, 2);
        ctx.lineTo(-8, 5);
        ctx.lineTo(6, 6);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';
        const shellGrad = ctx.createLinearGradient(-10, 0, 12, 0);
        shellGrad.addColorStop(0, '#a1a1aa');
        shellGrad.addColorStop(0.5, '#f4f4f5');
        shellGrad.addColorStop(1, '#d4d4d8');
        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(5, -4);
        ctx.lineTo(-7, -3);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-7, 3);
        ctx.lineTo(5, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(-5, -1.5);
        ctx.lineTo(-1, -1.5);
        ctx.lineTo(-1, 1.5);
        ctx.lineTo(-5, 1.5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-9, -1.5);
        ctx.lineTo(-6, -1.5);
        ctx.lineTo(-6, 1.5);
        ctx.lineTo(-9, 1.5);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(2, 0, 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(11, -2, 4, 4);
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(15, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.beginPath();
        ctx.arc(15.3, -0.4, 0.55, 0, Math.PI * 2);
        ctx.fill();

        const drawLED = (lx: number, ly: number, color: string, glowStr: string) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(lx, ly, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = glowStr;
            ctx.shadowBlur = 6;
            ctx.fillStyle = glowStr;
            ctx.beginPath();
            ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = 'transparent';
        };

        drawLED(5, -6, '#34d399', 'rgba(52, 211, 153, 0.85)');
        drawLED(5, 6, '#34d399', 'rgba(52, 211, 153, 0.85)');
        drawLED(-12, -2, '#f87171', 'rgba(248, 113, 113, 0.85)');
        drawLED(-12, 2, '#f87171', 'rgba(248, 113, 113, 0.85)');

        ctx.restore();

        // Velocity heading tick (world space)
        if (speed > 0.15) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo((velocity.x / speed) * 28, (velocity.y / speed) * 28);
            ctx.stroke();
            ctx.restore();
        }

        drawHudOverlay(ctx, w, h, tick, sensorRange, drone.energy);
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
