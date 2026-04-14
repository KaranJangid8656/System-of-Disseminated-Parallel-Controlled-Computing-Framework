'use client';

import React, { useRef, useEffect } from 'react';
import { SimulationState, Vector2D } from '../types/simulation';

interface CanvasProps {
    stateRef: React.MutableRefObject<SimulationState>;
    sensorRange: number;
    onCanvasClick: (pos: Vector2D, rightClick?: boolean) => void;
    tick: number;
}

const ROLE_COLORS: Record<string, string> = {
    LEAD: '#00f2ff',
    SCOUT: '#ffcc00',
    WINGMAN: '#00ffaa',
    SUPPORT: '#ff6b35',
    RECON: '#b06cff',
};

const THREAT_PALETTE: Record<string, string> = {
    green: 'rgba(0,255,170,0.15)',
    yellow: 'rgba(255,204,0,0.15)',
    orange: 'rgba(255,107,53,0.15)',
    red: 'rgba(255,0,85,0.15)',
};

const Canvas: React.FC<CanvasProps> = ({ stateRef, sensorRange, onCanvasClick, tick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleResize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const { drone, obstacles, target, detectedObstacles, missions, threatLevel } = stateRef.current;
        const T = Date.now();

        // Background fill
        ctx.fillStyle = '#040d18';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Threat level overlay
        ctx.fillStyle = THREAT_PALETTE[threatLevel] || 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Scanline animation
        const scanY = (T / 8000 % 1) * canvas.height;
        const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
        scanGrad.addColorStop(0, 'transparent');
        scanGrad.addColorStop(0.5, 'rgba(0,242,255,0.08)');
        scanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 2, canvas.width, 4);

        // Draw mission waypoints
        missions.forEach(mission => {
            if (mission.status === 'completed') return;
            mission.waypoints.forEach((wp, wi) => {
                if (wp.reached) return;
                const next = mission.waypoints[wi + 1];
                if (next && !next.reached) {
                    ctx.strokeStyle = 'rgba(255,204,0,0.2)';
                    ctx.setLineDash([4, 8]);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(wp.pos.x, wp.pos.y);
                    ctx.lineTo(next.pos.x, next.pos.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                const pulse = Math.sin(T / 600 + wi) * 0.4 + 0.6;
                ctx.strokeStyle = `rgba(255,204,0,${pulse})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.arc(wp.pos.x, wp.pos.y, 12 + Math.sin(T / 400 + wi) * 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(255,204,0,0.8)';
                ctx.beginPath(); ctx.arc(wp.pos.x, wp.pos.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,204,0,0.9)';
                ctx.font = 'bold 9px monospace';
                ctx.fillText(wp.label, wp.pos.x + 8, wp.pos.y - 8);
            });
        });

        // Draw obstacles
        obstacles.forEach(obs => {
            const isDetected = detectedObstacles.includes(obs.id);
            const isDynamic = obs.type === 'dynamic';
            const baseAlpha = isDetected ? 0.85 : 0.5;
            const color = isDetected ? '#ff0055' : isDynamic ? '#ff6b35' : '#7000ff';

            // Glow halo
            const glowGrad = ctx.createRadialGradient(obs.pos.x, obs.pos.y, 0, obs.pos.x, obs.pos.y, obs.radius + 25);
            glowGrad.addColorStop(0, `${color}55`);
            glowGrad.addColorStop(1, `${color}00`);
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(obs.pos.x, obs.pos.y, obs.radius + 25, 0, Math.PI * 2); ctx.fill();

            // Body
            ctx.fillStyle = `${color}${Math.floor(baseAlpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath(); ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2); ctx.fill();

            // Inner ring
            ctx.strokeStyle = `${color}cc`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(obs.pos.x, obs.pos.y, obs.radius * 0.65, 0, Math.PI * 2); ctx.stroke();

            // Dynamic pulsing ring
            if (isDynamic) {
                const pRad = obs.radius + 8 + Math.sin(T / 300) * 4;
                ctx.strokeStyle = `rgba(255,107,53,${0.3 + Math.sin(T / 300) * 0.2})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.arc(obs.pos.x, obs.pos.y, pRad, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
            }

            // Label
            if (isDetected) {
                ctx.fillStyle = '#ff0055';
                ctx.font = 'bold 8px monospace';
                ctx.fillText('THREAT', obs.pos.x - 14, obs.pos.y + obs.radius + 14);
            }
        });

        // Draw global target
        const tPulse = Math.sin(T / 500) * 3;
        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(target.x, target.y, 18 + tPulse, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#00ffaa';
        ctx.beginPath(); ctx.arc(target.x, target.y, 5, 0, Math.PI * 2); ctx.fill();
        // Cross hairs
        ctx.strokeStyle = 'rgba(0,255,170,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(target.x - 25, target.y); ctx.lineTo(target.x + 25, target.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(target.x, target.y - 25); ctx.lineTo(target.x, target.y + 25); ctx.stroke();
        ctx.fillStyle = 'rgba(0,255,170,0.7)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('TARGET', target.x + 10, target.y - 8);

        // Draw drone
        const color = ROLE_COLORS.LEAD;
        const { pos, trail, velocity } = drone;

        // Trail
        if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
                const alpha = (1 - i / trail.length) * 0.5;
                ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = Math.max(0.5, 2 - i * 0.05);
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
                ctx.lineTo(trail[i].x, trail[i].y);
                ctx.stroke();
            }
        }

        // Path to target
        ctx.strokeStyle = `${color}20`;
        ctx.setLineDash([4, 10]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(target.x, target.y); ctx.stroke();
        ctx.setLineDash([]);

        // Sensor range ring
        ctx.strokeStyle = `${color}18`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, sensorRange, 0, Math.PI * 2); ctx.stroke();

        // Drone glow
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        // Body (hexagon-ish)
        ctx.translate(pos.x, pos.y);
        const angle = Math.atan2(velocity.y, velocity.x);
        ctx.rotate(angle + Math.PI / 4);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill();

        // Center dot
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

        // Rotors
        const rTime = T / 60;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        for (let r = 0; r < 4; r++) {
            ctx.save();
            ctx.rotate((Math.PI / 2) * r + rTime);
            ctx.beginPath();
            ctx.moveTo(8, 0); ctx.lineTo(16, 0);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        // Unit label
        ctx.fillStyle = color;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`${drone.id}·LEAD`, pos.x + 15, pos.y - 12);

        // Battery indicator
        const battW = 20;
        const battFill = (drone.battery / 100) * battW;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(pos.x + 15, pos.y, battW, 4);
        ctx.fillStyle = drone.battery > 50 ? '#00ffaa' : drone.battery > 25 ? '#ffcc00' : '#ff0055';
        ctx.fillRect(pos.x + 15, pos.y, battFill, 4);


    }, [stateRef, sensorRange, tick]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        onCanvasClick(pos, e.button === 2);
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        onCanvasClick(pos, true);
    };

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        />
    );
};

export default Canvas;
