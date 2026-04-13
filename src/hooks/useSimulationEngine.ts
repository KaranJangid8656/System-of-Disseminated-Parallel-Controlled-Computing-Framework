import { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationState, DroneState, Vector2D, Obstacle, LogEntry } from '../types/simulation';

const DEFAULT_SPEED = 2;
const DEFAULT_SENSOR_RANGE = 80;

export const useSimulationEngine = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(DEFAULT_SPEED);
    const [sensorRange, setSensorRange] = useState(DEFAULT_SENSOR_RANGE);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Using refs for mutable state to avoid re-renders at high frequencies
    // and to simulate shared memory between modules
    const stateRef = useRef<SimulationState>({
        drone: {
            pos: { x: 50, y: 50 },
            velocity: { x: 0, y: 0 },
            target: { x: 500, y: 300 },
            speed: DEFAULT_SPEED
        },
        obstacles: [
            { id: '1', pos: { x: 200, y: 150 }, radius: 30 },
            { id: '2', pos: { x: 350, y: 400 }, radius: 40 },
            { id: '3', pos: { x: 500, y: 200 }, radius: 25 },
        ],
        target: { x: 600, y: 400 },
        isRunning: false,
        sensorRange: DEFAULT_SENSOR_RANGE,
        detectedObstacles: [],
        logs: []
    });

    // Module activity indicators
    const [activeModules, setActiveModules] = useState({
        sensor: false,
        navigation: false,
        control: false
    });

    const addLog = useCallback((module: LogEntry['module'], message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            module,
            message,
            type
        };
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    }, []);

    // Module 1: Sensor Module (Low Frequency - 300ms)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setActiveModules(prev => ({ ...prev, sensor: true }));
            setTimeout(() => setActiveModules(prev => ({ ...prev, sensor: false })), 100);

            const { drone, obstacles, sensorRange } = stateRef.current;
            const detected: string[] = [];

            obstacles.forEach(obs => {
                const dist = Math.sqrt(
                    Math.pow(drone.pos.x - obs.pos.x, 2) +
                    Math.pow(drone.pos.y - obs.pos.y, 2)
                );
                if (dist < sensorRange + obs.radius) {
                    detected.push(obs.id);
                }
            });

            if (detected.length > stateRef.current.detectedObstacles.length) {
                addLog('SENSOR', `Danger! ${detected.length} obstacle(s) detected.`, 'warning');
            } else if (detected.length < stateRef.current.detectedObstacles.length && detected.length === 0) {
                addLog('SENSOR', 'Field clear.', 'success');
            }

            stateRef.current.detectedObstacles = detected;
        }, 300);

        return () => clearInterval(interval);
    }, [isRunning, addLog]);

    // Module 2: Navigation Module (Medium Frequency - 100ms)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setActiveModules(prev => ({ ...prev, navigation: true }));
            setTimeout(() => setActiveModules(prev => ({ ...prev, navigation: false })), 50);

            const { drone, target, obstacles, detectedObstacles } = stateRef.current;

            // Basic vector to target
            let dx = target.x - drone.pos.x;
            let dy = target.y - drone.pos.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                dx /= dist;
                dy /= dist;
            } else {
                dx = 0;
                dy = 0;
                if (isRunning) {
                    setIsRunning(false);
                    addLog('SYSTEM', 'Target reached! Mission complete.', 'success');
                }
            }

            // Obstacle Avoidance (Repulsion)
            let rx = 0;
            let ry = 0;

            detectedObstacles.forEach(id => {
                const obs = obstacles.find(o => o.id === id);
                if (obs) {
                    const ox = drone.pos.x - obs.pos.x;
                    const oy = drone.pos.y - obs.pos.y;
                    const oDist = Math.sqrt(ox * ox + oy * oy);
                    rx += ox / oDist;
                    ry += oy / oDist;
                }
            });

            // Combine vectors
            const finalVx = dx + rx * 2;
            const finalVy = dy + ry * 2;
            const finalDist = Math.sqrt(finalVx * finalVx + finalVy * finalVy);

            if (finalDist > 0) {
                stateRef.current.drone.velocity = {
                    x: (finalVx / finalDist) * speed,
                    y: (finalVy / finalDist) * speed
                };
            }

            if (detectedObstacles.length > 0) {
                // addLog('NAV', 'Adjusting path for obstacles...', 'info');
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isRunning, speed, addLog]);

    // Module 3: Control Module (High Frequency - 50ms)
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setActiveModules(prev => ({ ...prev, control: true }));
            setTimeout(() => setActiveModules(prev => ({ ...prev, control: false })), 25);

            const { drone } = stateRef.current;

            stateRef.current.drone.pos = {
                x: drone.pos.x + drone.velocity.x,
                y: drone.pos.y + drone.velocity.y
            };
        }, 50);

        return () => clearInterval(interval);
    }, [isRunning]);

    const startSimulation = () => {
        setIsRunning(true);
        addLog('SYSTEM', 'Simulation started.', 'info');
    };

    const stopSimulation = () => {
        setIsRunning(false);
        addLog('SYSTEM', 'Simulation stopped.', 'info');
    };

    const resetSimulation = () => {
        setIsRunning(false);
        stateRef.current.drone.pos = { x: 50, y: 50 };
        stateRef.current.drone.velocity = { x: 0, y: 0 };
        stateRef.current.detectedObstacles = [];
        setLogs([]);
        addLog('SYSTEM', 'Environment reset.', 'info');
    };

    const setTarget = (pos: Vector2D) => {
        stateRef.current.target = pos;
        addLog('NAV', `New target set at (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 'info');
    };

    const addObstacle = (pos: Vector2D) => {
        const newObs: Obstacle = {
            id: Math.random().toString(36).substr(2, 9),
            pos,
            radius: 20 + Math.random() * 30
        };
        stateRef.current.obstacles.push(newObs);
        addLog('SYSTEM', 'New obstacle deployed.', 'info');
    };

    return {
        stateRef,
        isRunning,
        speed,
        setSpeed,
        sensorRange,
        setSensorRange,
        logs,
        activeModules,
        startSimulation,
        stopSimulation,
        resetSimulation,
        setTarget,
        addObstacle,
        addLog
    };
};
