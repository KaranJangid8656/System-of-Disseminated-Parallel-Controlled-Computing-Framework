import React, { useRef, useEffect } from 'react';
import { SimulationState, Vector2D } from '../types/simulation';

interface CanvasProps {
    stateRef: React.MutableRefObject<SimulationState>;
    sensorRange: number;
    onCanvasClick: (pos: Vector2D) => void;
}

const Canvas: React.FC<CanvasProps> = ({ stateRef, sensorRange, onCanvasClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const { drone, obstacles, target, detectedObstacles } = stateRef.current;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw grid
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i < canvas.width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += 40) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }

            // Draw obstacles
            obstacles.forEach(obs => {
                const isDetected = detectedObstacles.includes(obs.id);
                
                // Outer glow
                const gradient = ctx.createRadialGradient(
                    obs.pos.x, obs.pos.y, 0,
                    obs.pos.x, obs.pos.y, obs.radius + 10
                );
                
                if (isDetected) {
                    gradient.addColorStop(0, 'rgba(255, 0, 85, 0.4)');
                    gradient.addColorStop(1, 'rgba(255, 0, 85, 0)');
                } else {
                    gradient.addColorStop(0, 'rgba(112, 0, 255, 0.2)');
                    gradient.addColorStop(1, 'rgba(112, 0, 255, 0)');
                }

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(obs.pos.x, obs.pos.y, obs.radius + 10, 0, Math.PI * 2);
                ctx.fill();

                // Obstacle body
                ctx.fillStyle = isDetected ? '#ff0055' : '#7000ff';
                ctx.beginPath();
                ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner highlight
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(obs.pos.x, obs.pos.y, obs.radius - 5, 0, Math.PI * 2);
                ctx.stroke();
            });

            // Draw target
            ctx.strokeStyle = '#00ffaa';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath();
            ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw sensor range
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(drone.pos.x, drone.pos.y, sensorRange, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw drone
            ctx.save();
            ctx.translate(drone.pos.x, drone.pos.y);
            
            // Drone shadow/glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';
            
            // Body
            ctx.fillStyle = '#00f2ff';
            ctx.beginPath();
            ctx.roundRect(-15, -15, 30, 30, 5);
            ctx.fill();

            // Rotors (Visual only)
            const time = Date.now() / 100;
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3;
            for(let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate((Math.PI / 2) * i + time);
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(20, 0);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();

            // Path to target (dashed line)
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.moveTo(drone.pos.x, drone.pos.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            ctx.setLineDash([]);

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [stateRef, sensorRange]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            onCanvasClick({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-crosshair rounded-lg"
            onClick={handleClick}
        />
    );
};

export default Canvas;
