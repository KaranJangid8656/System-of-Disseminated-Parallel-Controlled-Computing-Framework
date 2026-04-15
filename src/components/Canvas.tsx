'use client';

import React, { useRef, useEffect } from 'react';
import { SimulationState, Vector2D, Mission } from '../types/simulation';

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

const Canvas: React.FC<CanvasProps> = ({ stateRef, sensorRange, onCanvasClick, tick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initial resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
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

    // Main Draw Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { drone, obstacles, target, detectedObstacles, missions, threatLevel } = stateRef.current;
        const T = Date.now();

        // ─── TACTICAL BACKGROUND ───
        ctx.fillStyle = '#02060c'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Radar Sweep & Circles
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
        for (let r = 1; r <= 5; r++) {
            ctx.beginPath(); ctx.arc(0, 0, r * 150, 0, Math.PI * 2); ctx.stroke();
        }
        const sweepAngle = (T / 2000) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 800, sweepAngle, sweepAngle + 0.4);
        ctx.fillStyle = 'rgba(0, 242, 255, 0.03)';
        ctx.fill();
        ctx.restore();

        // Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 0.5;
        const spacing = 50;
        for(let x=0; x<canvas.width; x+=spacing) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
        for(let y=0; y<canvas.height; y+=spacing) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

        // ─── MISSION WAYPOINTS ───
        missions.forEach(mission => {
            if (mission.status === 'active') {
                mission.waypoints.forEach((wp, idx) => {
                    const isReached = wp.reached;
                    const color = isReached ? '#00ffaa' : '#00f2ff';
                    
                    ctx.save();
                    ctx.translate(wp.pos.x, wp.pos.y);
                    
                    // Technical diamond
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = isReached ? 0.2 : 0.8;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -6); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0); ctx.closePath();
                    ctx.stroke();
                    
                    // Active Target Pulse
                    const isActiveTarget = !isReached && (idx === 0 || mission.waypoints[idx-1].reached);
                    if (isActiveTarget) {
                        const pulse = (Math.sin(T / 200) + 1) / 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, 8 + pulse * 8, 0, Math.PI * 2);
                        ctx.strokeStyle = `${color}40`;
                        ctx.stroke();
                    }

                    ctx.fillStyle = color;
                    ctx.globalAlpha = isReached ? 0.3 : 0.6;
                    ctx.font = '7px monospace';
                    ctx.fillText(`WP-0${idx+1}`, 10, 3);
                    ctx.restore();
                });
            }
        });

        // ─── OBSTACLES (HEAT SIGNATURES) ───
        obstacles.forEach(obs => {
            const isDetected = detectedObstacles.includes(obs.id);
            const color = isDetected ? '#ff4d00' : '#2a2e35';
            
            ctx.save();
            ctx.translate(obs.pos.x, obs.pos.y);
            
            if (isDetected) {
                const gradO = ctx.createRadialGradient(0, 0, 0, 0, 0, obs.radius);
                gradO.addColorStop(0, 'rgba(255, 77, 0, 0.15)');
                gradO.addColorStop(1, 'rgba(255, 77, 0, 0)');
                ctx.fillStyle = gradO;
                ctx.beginPath(); ctx.arc(0, 0, obs.radius, 0, Math.PI * 2); ctx.fill();
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            const r = obs.radius;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
            
            // Corner Brackets
            const cs = 5;
            ctx.beginPath();
            ctx.moveTo(-r, -r+cs); ctx.lineTo(-r, -r); ctx.lineTo(-r+cs, -r);
            ctx.moveTo(r-cs, -r); ctx.lineTo(r, -r); ctx.lineTo(r, -r+cs);
            ctx.moveTo(r, r-cs); ctx.lineTo(r, r); ctx.lineTo(r-cs, r);
            ctx.moveTo(-r+cs, r); ctx.lineTo(-r, r); ctx.lineTo(-r, r-cs);
            ctx.stroke();

            if (isDetected) {
                ctx.fillStyle = color;
                ctx.font = 'bold 8px monospace';
                ctx.fillText(`THREAT::LOW_FREQ`, -r, -r - 6);
            }
            ctx.restore();
        });

        // ─── TARGET CROSSHAIR ───
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.strokeStyle = '#00ffaa';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.moveTo(-20, 0); ctx.lineTo(-4, 0);
        ctx.moveTo(20, 0); ctx.lineTo(4, 0);
        ctx.moveTo(0, -20); ctx.lineTo(0, -4);
        ctx.moveTo(0, 20); ctx.lineTo(0, 4);
        ctx.stroke();
        ctx.restore();

        // ─── DRONE (UAV-704) ───
        const { pos, trail, velocity } = drone;
        const angle = Math.atan2(velocity.y, velocity.x);

        // Path Prediction Line
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
        ctx.setLineDash([5, 10]);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(target.x, target.y); ctx.stroke();
        ctx.setLineDash([]);

        // Flight Trail
        if (trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                ctx.strokeStyle = `rgba(0, 242, 255, ${(1 - i / trail.length) * 0.3})`;
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.stroke();
        }

        // Realistic Drone Body
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 242, 255, 0.3)';
        
        // Arms
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
        ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
        ctx.stroke();

        // Fuselage
        ctx.fillStyle = '#111';
        ctx.fillRect(-6, -14, 12, 28);
        ctx.fillStyle = '#222';
        ctx.fillRect(-4, -12, 8, 24);
        
        // Camera
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath(); ctx.arc(0, 14, 1.5, 0, Math.PI * 2); ctx.fill();

        // Rotors
        const rTime = T / 40;
        [[-10,-10], [10,-10], [10,10], [-10,10]].forEach(([ax, ay]) => {
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(rTime);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
            ctx.restore();
        });
        ctx.restore();

        // ─── HUD OVERLAY ───
        ctx.save();
        const hudY = canvas.height - 35;
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 80, hudY);
        ctx.lineTo(canvas.width / 2 + 80, hudY);
        ctx.stroke();
        ctx.fillStyle = '#00f2ff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(drone.heading || 0)}°_HEAD`, canvas.width / 2, hudY - 8);
        ctx.restore();

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
