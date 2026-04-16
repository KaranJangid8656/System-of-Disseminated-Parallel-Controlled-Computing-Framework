'use client';

import React, { useRef, useEffect } from 'react';
import { SimulationState, Vector2D } from '../types/simulation';

interface CanvasProps {
    stateRef: React.MutableRefObject<SimulationState>;
    sensorRange: number;
    onCanvasClick: (pos: Vector2D, rightClick?: boolean, shiftClick?: boolean) => void;
    tick: number;
}

const Canvas: React.FC<CanvasProps> = ({ stateRef, onCanvasClick, tick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const terrainCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const smoothedAngleRef = useRef<number>(0);

    // Tactical Radar Background Generator (cached offscreen)
    const generateTerrain = (width: number, height: number) => {
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return offscreen;

        // ── Base Finish ──
        ctx.fillStyle = '#020617'; // Deep Navy Black
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        // ── Radial Guide Rings ──
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; // Slate-400 / Cyan mix
        ctx.lineWidth = 1;
        for (let r = 100; r < Math.max(width, height); r += 100) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
            
            // Distance marker
            ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.font = '9px monospace';
            ctx.fillText(`${r}M`, centerX + r + 4, centerY - 4);
        }

        // ── Tactical Grid ──
        const spacing = 50;
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y <= height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // ── Crosshair / Radial Lines ──
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
        ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Grid Intersection Points ──
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        for (let x = 0; x <= width; x += spacing * 2) {
            for (let y = 0; y <= height; y += spacing * 2) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Vignette Overlay ──
        const vGrad = ctx.createRadialGradient(centerX, centerY, 100, centerX, centerY, Math.max(width, height) * 0.7);
        vGrad.addColorStop(0, 'rgba(2, 6, 23, 0)');
        vGrad.addColorStop(1, 'rgba(2, 6, 23, 0.8)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, width, height);

        return offscreen;
    };


    // Robust Resize Handling right before drawing frame
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas pixel dimensions match layout dimensions
        if (canvas.parentElement) {
            const rect = canvas.parentElement.getBoundingClientRect();
            const w = Math.floor(rect.width);
            const h = Math.floor(rect.height);
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                // Regenerate terrain only on a real resize
                terrainCanvasRef.current = generateTerrain(w, h);
            }
        }
        
        // Ensure terrain exists initially
        if (!terrainCanvasRef.current) {
            terrainCanvasRef.current = generateTerrain(canvas.width, canvas.height);
        }

        const { drone, obstacles, target, detectedObstacles, missions } = stateRef.current;

        // Draw cached realistic terrain background
        if (terrainCanvasRef.current) {
            ctx.drawImage(terrainCanvasRef.current, 0, 0);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Missions / Waypoints
        missions.forEach(mission => {
            if (mission.status === 'active') {
                mission.waypoints.forEach((wp, idx) => {
                    const isReached = wp.reached;
                    const color = isReached ? '#10b981' : '#3b82f6';

                    ctx.save();
                    ctx.translate(wp.pos.x, wp.pos.y);
                    
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();

                    ctx.fillStyle = '#94a3b8'; // slate-400
                    ctx.globalAlpha = 1;
                    ctx.font = '10px ui-sans-serif, system-ui';
                    ctx.fillText(`WP-${idx + 1}`, 14, 4);
                    ctx.restore();
                });
            }
        });

        // Obstacles
        obstacles.forEach(obs => {
            const isDetected = detectedObstacles.includes(obs.id);
            const color = isDetected ? '#ef4444' : '#475569'; // red-500 : slate-600
            
            ctx.save();
            ctx.translate(obs.pos.x, obs.pos.y);
            
            ctx.fillStyle = isDetected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(71, 85, 105, 0.1)';
            ctx.beginPath(); ctx.arc(0, 0, obs.radius, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, obs.radius, 0, Math.PI * 2); ctx.stroke();
            
            ctx.fillStyle = color;
            ctx.font = '10px sans-serif';
            ctx.fillText(isDetected ? `Obstacle (${Math.round(obs.radius)}m)` : 'Unknown', -15, obs.radius + 14);
            ctx.restore();
        });

        // Direct Target Vector
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.strokeStyle = '#10b981'; // emerald-500
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
        ctx.moveTo(0, -8); ctx.lineTo(0, 8);
        ctx.stroke();
        ctx.restore();

        // Drone
        const { pos, trail, velocity } = drone;
        // Smooth display angle — lerp via shortest angular path to prevent spinning
        const rawAngle = Math.atan2(velocity.y, velocity.x);
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        if (speed > 0.05) { // only rotate when actually moving
            let delta = rawAngle - smoothedAngleRef.current;
            // Wrap delta to [-π, π] for shortest path
            while (delta >  Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            smoothedAngleRef.current += delta * 0.10; // 0.10 = rotation smoothing factor
        }
        const angle = smoothedAngleRef.current;

        // Path Prediction Line
        ctx.strokeStyle = '#334155'; // slate-700
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(target.x, target.y); ctx.stroke();
        ctx.setLineDash([]);

        // Clean Minimal Trail
        if (trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - i / trail.length) * 0.5})`; // blue-500
                ctx.lineWidth = 2;
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.stroke();
        }

        // --- ULTRA-REALISTIC QUADCOPTER MODEL ---
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.scale(1.4, 1.4); 
        
        // --- 1. Main Drop Shadow ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.shadowOffsetX = -2;

        // --- 2. Advanced Drone Arms ---
        // Thick arms with metallic gradient
        const armGrad1 = ctx.createLinearGradient(-10, -10, 10, 10);
        armGrad1.addColorStop(0, '#0f172a');
        armGrad1.addColorStop(0.5, '#475569');
        armGrad1.addColorStop(1, '#0f172a');
        
        const armGrad2 = ctx.createLinearGradient(-10, 10, 10, -10);
        armGrad2.addColorStop(0, '#0f172a');
        armGrad2.addColorStop(0.5, '#475569');
        armGrad2.addColorStop(1, '#0f172a');

        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        // Arm 1 (diagonal)
        ctx.strokeStyle = armGrad1;
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
        ctx.stroke();

        // Arm 2 (diagonal)
        ctx.strokeStyle = armGrad2;
        ctx.beginPath();
        ctx.moveTo(-10, 10); ctx.lineTo(10, -10);
        ctx.stroke();

        // Caution tip stripes on front arms
        ctx.strokeStyle = '#eab308'; // caution yellow
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(7, 7); ctx.lineTo(9, 9);
        ctx.moveTo(7, -7); ctx.lineTo(9, -9);
        ctx.stroke();

        // Turn off shadow for internal geometry
        ctx.shadowColor = 'transparent'; 

        // --- 3. Motor Mounts & Realistic Prop Guards (SHRUNK) ---
        const drawRealisticRotor = (x: number, y: number) => {
            // Guard structural wire-supports
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y - 6.5); ctx.lineTo(x, y + 6.5);
            ctx.moveTo(x - 6.5, y); ctx.lineTo(x + 6.5, y);
            ctx.stroke();

            // Outer Guard Ring (metallic shading) - Shrunk from 9 to 6.5
            const ringGrad = ctx.createLinearGradient(x - 6.5, y - 6.5, x + 6.5, y + 6.5);
            ringGrad.addColorStop(0, '#64748b');
            ringGrad.addColorStop(1, '#cbd5e1');
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x, y, 6.5, 0, Math.PI * 2);
            ctx.stroke();

            // Dynamic Motor Housing
            const motorGrad = ctx.createRadialGradient(x, y, 0.5, x, y, 3.5);
            motorGrad.addColorStop(0, '#94a3b8');
            motorGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = motorGrad;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // High-Speed Blades (Translucent sweeping gradient)
            ctx.save();
            ctx.translate(x, y);
            
            ctx.fillStyle = 'rgba(248, 250, 252, 0.5)'; 
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, 0, Math.PI / 2.5);
            ctx.lineTo(0, 0);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(248, 250, 252, 0.3)'; 
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, Math.PI, Math.PI + Math.PI / 2.5);
            ctx.lineTo(0, 0);
            ctx.fill();
            
            // Metallic Spinner Cap
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        // Render the 4 rotors (shrunk and slightly pulled in)
        drawRealisticRotor(11, -11);   
        drawRealisticRotor(11, 11);   
        drawRealisticRotor(-11, -11); 
        drawRealisticRotor(-11, 11);   

        // --- 4. Main Fuselage (Sleek DJI-style hexagonal polygon) ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        
        // Base plating (dark carbon)
        ctx.fillStyle = '#0f172a'; 
        ctx.beginPath();
        ctx.moveTo(14, 0);       // Nosedive
        ctx.lineTo(6, -6);       // Front-left wingtip
        ctx.lineTo(-8, -5);      // Rear-left wingtip
        ctx.lineTo(-12, -2);     // Rear engine exhaust left
        ctx.lineTo(-12, 2);      // Rear engine exhaust right
        ctx.lineTo(-8, 5);       // Rear-right wingtip
        ctx.lineTo(6, 6);        // Front-right wingtip
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Upper shell (metallic bright center spine)
        const shellGrad = ctx.createLinearGradient(-10, 0, 12, 0);
        shellGrad.addColorStop(0, '#94a3b8');
        shellGrad.addColorStop(0.5, '#f8fafc');
        shellGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = shellGrad;
        
        // Slightly smaller polygon on top for bevel effect
        ctx.beginPath();
        ctx.moveTo(11, 0);       
        ctx.lineTo(5, -4);       
        ctx.lineTo(-7, -3);      
        ctx.lineTo(-10, 0);     
        ctx.lineTo(-7, 3);       
        ctx.lineTo(5, 4);        
        ctx.closePath();
        ctx.fill();

        // High-tech battery / cooling vent array
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-5, -1.5); ctx.lineTo(-1, -1.5); ctx.lineTo(-1, 1.5); ctx.lineTo(-5, 1.5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-9, -1.5); ctx.lineTo(-6, -1.5); ctx.lineTo(-6, 1.5); ctx.lineTo(-9, 1.5);
        ctx.fill();

        // Center logo/branding subtle hex
        ctx.strokeStyle = '#3b82f6'; // blue logo accent
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(2, 0, 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // --- 5. Front Camera Gimbal Array ---
        // Gimbal mount base
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(11, -2, 4, 4);
        
        // Dark camera lens housing
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(15, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Lens reflection optical flare
        ctx.fillStyle = 'rgba(56, 189, 248, 0.8)'; // Cyan reflection
        ctx.beginPath();
        // ctx.arc(15.5, -0.5, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // --- 6. Glowing LED Navigation Beacons ---
        const drawLED = (x: number, y: number, color: string, glowStr: string) => {
            // Intense core
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Halo glow
            ctx.shadowColor = glowStr;
            ctx.shadowBlur = 6;
            ctx.fillStyle = glowStr;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowColor = 'transparent'; // reset
        };

        // Front (Green / Navigation) - Moved to the arm elbows
        drawLED(5, -6, '#10b981', 'rgba(16, 185, 129, 0.8)');
        drawLED(5, 6, '#10b981', 'rgba(16, 185, 129, 0.8)');

        // Rear (Red tail lights) - Moved to rear engine exhaust
        drawLED(-12, -2, '#ef4444', 'rgba(239, 68, 68, 0.8)');
        drawLED(-12, 2, '#ef4444', 'rgba(239, 68, 68, 0.8)');

        ctx.restore();

    }, [stateRef, tick]); // Redraw entirely every tick

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
        <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair rounded-xl border border-slate-800"
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            style={{ touchAction: 'none', display: 'block' }}
        />
    );
};

export default Canvas;
