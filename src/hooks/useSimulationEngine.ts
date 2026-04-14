import { useState, useEffect, useRef, useCallback } from 'react';
import {
    SimulationState, DroneState, Vector2D, Obstacle,
    LogEntry, Mission, ModuleStats, TelemetryPoint
} from '../types/simulation';

const CANVAS_W = 900;
const CANVAS_H = 600;
const TRAIL_LENGTH = 60;
const DEFAULT_SPEED = 2.5;
const DEFAULT_SENSOR_RANGE = 90;
const WAYPOINT_REACH_RADIUS = 18;

function normalize(v: Vector2D): Vector2D {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y);
    if (mag < 0.0001) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
}

function dist(a: Vector2D, b: Vector2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Vector2D, s: number): Vector2D {
    return { x: v.x * s, y: v.y * s };
}

function createInitialDrone(speed: number): DroneState {
    return {
        id: 'UAV-704',
        pos: { x: 80, y: 80 },
        velocity: { x: 0, y: 0 },
        target: { x: 750, y: 400 },
        speed,
        health: 100,
        battery: 100,
        altitude: 120,
        heading: 45,
        status: 'idle',
        trail: [],
        signalStrength: 98,
        totalDistanceTraveled: 0,
    };
}

function createInitialMissions(): Mission[] {
    return [
        {
            id: 'M01', name: 'Perimeter Recon',
            description: 'Sweep the outer boundary of the operational zone and return sensor data.',
            waypoints: [
                { id: 'W1', pos: { x: 750, y: 100 }, label: 'Alpha', reached: false },
                { id: 'W2', pos: { x: 750, y: 500 }, label: 'Beta', reached: false },
                { id: 'W3', pos: { x: 150, y: 500 }, label: 'Gamma', reached: false },
                { id: 'W4', pos: { x: 150, y: 100 }, label: 'Delta', reached: false },
            ],
            status: 'pending', priority: 'high'
        },
        {
            id: 'M02', name: 'Target Acquisition',
            description: 'Locate and mark high-value objectives in the designated engagement zone.',
            waypoints: [
                { id: 'W5', pos: { x: 420, y: 180 }, label: 'Obj-1', reached: false },
                { id: 'W6', pos: { x: 620, y: 320 }, label: 'Obj-2', reached: false },
                { id: 'W7', pos: { x: 500, y: 480 }, label: 'Obj-3', reached: false },
            ],
            status: 'pending', priority: 'critical'
        },
        {
            id: 'M03', name: 'Extraction Protocol',
            description: 'Navigate to extraction point while avoiding all dynamic threat vectors.',
            waypoints: [
                { id: 'W8', pos: { x: 300, y: 300 }, label: 'Relay', reached: false },
                { id: 'W9', pos: { x: 820, y: 280 }, label: 'Extract', reached: false },
            ],
            status: 'pending', priority: 'medium'
        },
    ];
}

function createInitialObstacles(): Obstacle[] {
    return [
        { id: 'OB1', pos: { x: 230, y: 170 }, radius: 35, type: 'static', label: 'STRUCTURE-A' },
        { id: 'OB2', pos: { x: 400, y: 380 }, radius: 44, type: 'static', label: 'STRUCTURE-B' },
        { id: 'OB3', pos: { x: 570, y: 210 }, radius: 28, type: 'static', label: 'TOWER-C' },
        { id: 'OB4', pos: { x: 680, y: 460 }, radius: 32, type: 'static', label: 'OUTPOST-D' },
        { id: 'OB5', pos: { x: 320, y: 520 }, radius: 22, type: 'dynamic', velocity: { x: 0.5, y: -0.25 }, label: 'MOBILE-01' },
        { id: 'OB6', pos: { x: 510, y: 350 }, radius: 19, type: 'dynamic', velocity: { x: -0.35, y: 0.6 }, label: 'MOBILE-02' },
    ];
}

export const useSimulationEngine = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeedState] = useState(DEFAULT_SPEED);
    const [sensorRange, setSensorRangeState] = useState(DEFAULT_SENSOR_RANGE);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [tick, setTick] = useState(0);
    const [moduleStats, setModuleStats] = useState<Record<string, ModuleStats>>({
        SENSOR: { name: 'SENSOR', executions: 0, avgLatency: 0, load: 0, frequency: '300ms', description: 'LiDAR proximity scan, obstacle detection, threat classification' },
        NAV: { name: 'NAV', executions: 0, avgLatency: 0, load: 0, frequency: '100ms', description: 'Vector field pathfinding, repulsive potential avoidance' },
        CONTROL: { name: 'CONTROL', executions: 0, avgLatency: 0, load: 0, frequency: '50ms', description: 'Position integration, motor command, boundary clamp' },
        COMM: { name: 'COMM', executions: 0, avgLatency: 0, load: 0, frequency: '600ms', description: 'Telemetry broadcast, signal strength, mission dispatch' },
        MISSION: { name: 'MISSION', executions: 0, avgLatency: 0, load: 0, frequency: '200ms', description: 'Waypoint tracking, mission state machine, objective logic' },
    });
    const [telemetry, setTelemetry] = useState<{
        systemLoad: TelemetryPoint[];
        threatLevel: TelemetryPoint[];
        battery: TelemetryPoint[];
        speed: TelemetryPoint[];
    }>({ systemLoad: [], threatLevel: [], battery: [], speed: [] });

    const stateRef = useRef<SimulationState>({
        drone: createInitialDrone(DEFAULT_SPEED),
        obstacles: createInitialObstacles(),
        target: { x: 750, y: 400 },
        isRunning: false,
        sensorRange: DEFAULT_SENSOR_RANGE,
        detectedObstacles: [],
        logs: [],
        missions: createInitialMissions(),
        activeMissionIndex: -1,
        tick: 0,
        elapsedTime: 0,
        threatLevel: 'green',
        pathHistory: [],
    });

    const [activeModules, setActiveModules] = useState<Record<string, boolean>>({
        sensor: false, navigation: false, control: false, comm: false, mission: false,
    });

    const addLog = useCallback((
        module: LogEntry['module'],
        message: string,
        type: LogEntry['type'] = 'info'
    ) => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            module, message, type,
        };
        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
    }, []);

    const updateModuleStats = useCallback((module: string, latency: number) => {
        setModuleStats(prev => {
            const curr = prev[module];
            if (!curr) return prev;
            const executions = curr.executions + 1;
            const avgLatency = (curr.avgLatency * (executions - 1) + latency) / executions;
            const load = Math.min(100, (avgLatency / 5) * 100);
            return { ...prev, [module]: { ...curr, executions, avgLatency, load } };
        });
    }, []);

    // ══════════════════════════════════════════════════════════
    // MODULE 1 — SENSOR (300ms)
    // Proximity detection, threat classification, alert dispatch
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            const t0 = performance.now();
            setActiveModules(p => ({ ...p, sensor: true }));
            setTimeout(() => setActiveModules(p => ({ ...p, sensor: false })), 140);

            const { drone, obstacles, sensorRange } = stateRef.current;
            const detected: string[] = [];

            obstacles.forEach(obs => {
                const d = dist(drone.pos, obs.pos);
                if (d < sensorRange + obs.radius) {
                    detected.push(obs.id);
                    if (d < obs.radius + 15) {
                        addLog('SENSOR', `⚠ COLLISION ALERT — ${obs.label ?? obs.id} at ${d.toFixed(0)}px`, 'critical');
                    }
                }
            });

            const prev = stateRef.current.detectedObstacles;
            if (detected.length > prev.length) {
                addLog('SENSOR', `${detected.length} obstacle(s) in sensor range — avoidance active`, 'warning');
            } else if (prev.length > 0 && detected.length === 0) {
                addLog('SENSOR', 'Sensor field clear — no active threats', 'success');
            }

            stateRef.current.detectedObstacles = detected;
            const threat = detected.length === 0 ? 'green' : detected.length < 2 ? 'yellow' : detected.length < 4 ? 'orange' : 'red';
            stateRef.current.threatLevel = threat;

            updateModuleStats('SENSOR', performance.now() - t0);
        }, 300);
        return () => clearInterval(interval);
    }, [isRunning, addLog, updateModuleStats]);

    // ══════════════════════════════════════════════════════════
    // MODULE 2 — NAVIGATION (100ms)
    // Vector field pathfinding with obstacle repulsion
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            const t0 = performance.now();
            setActiveModules(p => ({ ...p, navigation: true }));
            setTimeout(() => setActiveModules(p => ({ ...p, navigation: false })), 60);

            const { drone, obstacles, detectedObstacles, sensorRange } = stateRef.current;
            const { pos, target, speed: dSpeed } = drone;

            // Attractive force toward target
            const toTarget = normalize({ x: target.x - pos.x, y: target.y - pos.y });
            const dToTarget = dist(pos, target);

            if (dToTarget < 8) {
                stateRef.current.drone.velocity = { x: 0, y: 0 };
                stateRef.current.drone.status = 'holding';
                updateModuleStats('NAV', performance.now() - t0);
                return;
            }

            // Repulsive forces from detected obstacles
            let repulsion = { x: 0, y: 0 };
            detectedObstacles.forEach(id => {
                const obs = obstacles.find(o => o.id === id);
                if (!obs) return;
                const d = dist(pos, obs.pos);
                const effective = sensorRange + obs.radius;
                if (d < effective) {
                    const strength = Math.pow(Math.max(0, (effective - d) / effective), 2) * 5;
                    const away = normalize({ x: pos.x - obs.pos.x, y: pos.y - obs.pos.y });
                    repulsion = add(repulsion, scale(away, strength));
                    stateRef.current.drone.status = 'avoiding';
                }
            });

            // Boundary repulsion (soft walls)
            const margin = 40;
            if (pos.x < margin) repulsion.x += (margin - pos.x) / margin * 2;
            if (pos.x > CANVAS_W - margin) repulsion.x -= (pos.x - (CANVAS_W - margin)) / margin * 2;
            if (pos.y < margin) repulsion.y += (margin - pos.y) / margin * 2;
            if (pos.y > CANVAS_H - margin) repulsion.y -= (pos.y - (CANVAS_H - margin)) / margin * 2;

            const combined = add(toTarget, repulsion);
            const finalVel = scale(normalize(combined), dSpeed);

            stateRef.current.drone.velocity = finalVel;
            if (detectedObstacles.length === 0) stateRef.current.drone.status = 'navigating';

            // Update heading
            stateRef.current.drone.heading = (Math.atan2(finalVel.y, finalVel.x) * 180 / Math.PI + 360) % 360;

            updateModuleStats('NAV', performance.now() - t0);
        }, 100);
        return () => clearInterval(interval);
    }, [isRunning, updateModuleStats]);

    // ══════════════════════════════════════════════════════════
    // MODULE 3 — CONTROL (50ms)
    // Position integration, motor output, physics clamp
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            const t0 = performance.now();
            setActiveModules(p => ({ ...p, control: true }));
            setTimeout(() => setActiveModules(p => ({ ...p, control: false })), 30);

            stateRef.current.tick += 1;
            stateRef.current.elapsedTime += 50;

            const { drone } = stateRef.current;
            const newPos: Vector2D = {
                x: Math.max(10, Math.min(CANVAS_W - 10, drone.pos.x + drone.velocity.x)),
                y: Math.max(10, Math.min(CANVAS_H - 10, drone.pos.y + drone.velocity.y)),
            };

            // Track distance traveled
            const stepDist = dist(drone.pos, newPos);
            stateRef.current.drone.totalDistanceTraveled += stepDist;

            // Drain battery (~from movement and time)
            stateRef.current.drone.battery = Math.max(0, drone.battery - 0.008 - stepDist * 0.0005);

            // Simulate altitude variation
            stateRef.current.drone.altitude = 100 + Math.sin(stateRef.current.tick / 20) * 15;

            // Trail
            stateRef.current.drone.trail = [newPos, ...drone.trail.slice(0, TRAIL_LENGTH - 1)];
            stateRef.current.drone.pos = newPos;

            // Move dynamic obstacles
            stateRef.current.obstacles.forEach((obs, i) => {
                if (obs.type !== 'dynamic' || !obs.velocity) return;
                const np = { x: obs.pos.x + obs.velocity.x, y: obs.pos.y + obs.velocity.y };
                let nv = { ...obs.velocity };
                if (np.x < obs.radius || np.x > CANVAS_W - obs.radius) nv.x = -nv.x;
                if (np.y < obs.radius || np.y > CANVAS_H - obs.radius) nv.y = -nv.y;
                stateRef.current.obstacles[i].pos = {
                    x: Math.max(obs.radius, Math.min(CANVAS_W - obs.radius, np.x)),
                    y: Math.max(obs.radius, Math.min(CANVAS_H - obs.radius, np.y)),
                };
                stateRef.current.obstacles[i].velocity = nv;
            });

            setTick(t => t + 1);
            updateModuleStats('CONTROL', performance.now() - t0);
        }, 50);
        return () => clearInterval(interval);
    }, [isRunning, updateModuleStats]);

    // ══════════════════════════════════════════════════════════
    // MODULE 4 — MISSION (200ms)
    // Waypoint state machine, objective tracking, auto-advance
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            const t0 = performance.now();
            setActiveModules(p => ({ ...p, mission: true }));
            setTimeout(() => setActiveModules(p => ({ ...p, mission: false })), 80);

            const { drone, missions, activeMissionIndex } = stateRef.current;
            if (activeMissionIndex < 0 || activeMissionIndex >= missions.length) {
                updateModuleStats('MISSION', performance.now() - t0);
                return;
            }

            const mission = missions[activeMissionIndex];
            if (mission.status !== 'active') {
                updateModuleStats('MISSION', performance.now() - t0);
                return;
            }

            // Find the first unreached waypoint
            const nextWpIdx = mission.waypoints.findIndex(w => !w.reached);
            if (nextWpIdx === -1) {
                // All reached
                stateRef.current.missions[activeMissionIndex].status = 'completed';
                stateRef.current.missions[activeMissionIndex].endTime = Date.now();
                addLog('MISSION', `✅ Mission "${mission.name}" COMPLETED — all waypoints reached!`, 'success');
                stateRef.current.drone.status = 'mission_complete';
                return;
            }

            const nextWp = mission.waypoints[nextWpIdx];
            // Navigate drone toward waypoint
            stateRef.current.drone.target = nextWp.pos;
            stateRef.current.drone.status = 'waypoint_seek';

            // Check if reached
            if (dist(drone.pos, nextWp.pos) < WAYPOINT_REACH_RADIUS) {
                stateRef.current.missions[activeMissionIndex].waypoints[nextWpIdx].reached = true;
                stateRef.current.missions[activeMissionIndex].waypoints[nextWpIdx].reachedAt = Date.now();
                addLog('MISSION', `Waypoint "${nextWp.label}" reached — advancing to next objective`, 'success');
            }

            updateModuleStats('MISSION', performance.now() - t0);
        }, 200);
        return () => clearInterval(interval);
    }, [isRunning, addLog, updateModuleStats]);

    // ══════════════════════════════════════════════════════════
    // MODULE 5 — COMM (600ms)
    // Telemetry collection, signal simulation, health broadcast
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            const t0 = performance.now();
            setActiveModules(p => ({ ...p, comm: true }));
            setTimeout(() => setActiveModules(p => ({ ...p, comm: false })), 180);

            const now = Date.now();
            const { drone, threatLevel, detectedObstacles } = stateRef.current;

            // Signal fluctuation
            const newSig = Math.max(25, Math.min(100, drone.signalStrength + (Math.random() - 0.48) * 4));
            stateRef.current.drone.signalStrength = newSig;
            if (newSig < 40) addLog('COMM', `⚡ Signal degraded — link quality: ${newSig.toFixed(0)}%`, 'warning');

            const spd = Math.sqrt(drone.velocity.x ** 2 + drone.velocity.y ** 2);
            const threatVal = threatLevel === 'green' ? 0 : threatLevel === 'yellow' ? 33 : threatLevel === 'orange' ? 66 : 100;
            const sysLoad = 30 + detectedObstacles.length * 12 + (drone.status === 'avoiding' ? 25 : 0) + Math.random() * 10;

            setTelemetry(prev => {
                const trim = (arr: TelemetryPoint[]) => arr.slice(-40);
                return {
                    systemLoad: trim([...prev.systemLoad, { time: now, value: sysLoad }]),
                    threatLevel: trim([...prev.threatLevel, { time: now, value: threatVal }]),
                    battery: trim([...prev.battery, { time: now, value: drone.battery }]),
                    speed: trim([...prev.speed, { time: now, value: spd * 10 }]),
                };
            });

            updateModuleStats('COMM', performance.now() - t0);
        }, 600);
        return () => clearInterval(interval);
    }, [isRunning, addLog, updateModuleStats]);

    // ── Actions ──────────────────────────────────────────────

    const startSimulation = () => {
        setIsRunning(true);
        stateRef.current.isRunning = true;
        stateRef.current.drone.status = 'navigating';
        addLog('SYSTEM', '🚀 DPCC Framework ONLINE — all modules initializing', 'success');
        addLog('SYSTEM', 'UAV-704 systems nominal. Awaiting navigation order.', 'info');
    };

    const stopSimulation = () => {
        setIsRunning(false);
        stateRef.current.isRunning = false;
        stateRef.current.drone.status = 'idle';
        stateRef.current.drone.velocity = { x: 0, y: 0 };
        addLog('SYSTEM', '⛔ DPCC halted — UAV-704 holding position', 'warning');
    };

    const resetSimulation = () => {
        setIsRunning(false);
        stateRef.current = {
            drone: createInitialDrone(speed),
            obstacles: createInitialObstacles(),
            target: { x: 750, y: 400 },
            isRunning: false,
            sensorRange: DEFAULT_SENSOR_RANGE,
            detectedObstacles: [],
            logs: [],
            missions: createInitialMissions(),
            activeMissionIndex: -1,
            tick: 0,
            elapsedTime: 0,
            threatLevel: 'green',
            pathHistory: [],
        };
        setLogs([]);
        setTelemetry({ systemLoad: [], threatLevel: [], battery: [], speed: [] });
        setModuleStats(prev => Object.fromEntries(
            Object.entries(prev).map(([k, v]) => [k, { ...v, executions: 0, avgLatency: 0, load: 0 }])
        ));
        addLog('SYSTEM', '♻ Environment reset — DPCC framework re-initialized', 'info');
    };

    const setTarget = (pos: Vector2D) => {
        stateRef.current.target = pos;
        stateRef.current.drone.target = pos;
        // Cancel active mission waypoint control when user manually sets target
        if (stateRef.current.activeMissionIndex >= 0) {
            addLog('NAV', `Manual override — target → (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 'info');
        } else {
            addLog('NAV', `🎯 Target set → (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 'info');
        }
    };

    const addObstacle = (pos: Vector2D) => {
        const newObs: Obstacle = {
            id: `OB${Date.now().toString(36)}`,
            pos,
            radius: 18 + Math.random() * 26,
            type: 'static',
            label: `HAZARD-${stateRef.current.obstacles.length + 1}`,
        };
        stateRef.current.obstacles.push(newObs);
        addLog('SENSOR', `🔴 New static obstacle detected at (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 'warning');
    };

    const startMission = (index: number) => {
        if (index < 0 || index >= stateRef.current.missions.length) return;
        // Reset previously active mission
        const prev = stateRef.current.activeMissionIndex;
        if (prev >= 0 && prev !== index) {
            if (stateRef.current.missions[prev].status === 'active') {
                stateRef.current.missions[prev].status = 'pending';
            }
        }
        stateRef.current.activeMissionIndex = index;
        stateRef.current.missions[index].status = 'active';
        stateRef.current.missions[index].startTime = Date.now();
        const m = stateRef.current.missions[index];
        addLog('MISSION', `📋 Mission "${m.name}" [${m.priority.toUpperCase()}] activated`, 'info');
        if (!isRunning) startSimulation();
    };

    const updateSpeed = (val: number) => {
        setSpeedState(val);
        stateRef.current.drone.speed = val;
    };

    const updateSensorRange = (val: number) => {
        setSensorRangeState(val);
        stateRef.current.sensorRange = val;
    };

    return {
        stateRef,
        isRunning,
        speed,
        setSpeed: updateSpeed,
        sensorRange,
        setSensorRange: updateSensorRange,
        logs,
        activeModules,
        moduleStats,
        telemetry,
        tick,
        startSimulation,
        stopSimulation,
        resetSimulation,
        setTarget,
        addObstacle,
        addLog,
        startMission,
    };
};
