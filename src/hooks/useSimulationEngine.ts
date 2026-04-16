'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationKernel } from '../lib/dpcc/kernel/SimulationKernel';
import { AgentCore } from '../lib/dpcc/agent/AgentCore';
import { CommEngine } from '../lib/dpcc/comm/CommEngine';
import { SimulationState, LogEntry, TelemetryPoint, ModuleStats } from '../types/simulation';
import { DPCCEvent, ProcessorId } from '../lib/dpcc/types';

/**
 * DPCC Multi-Processor Simulation Engine Hook
 * Orchestrates the decentralized event-driven framework with
 * independent Sensor / Nav / Control / Comm processors.
 */
export const useSimulationEngine = () => {
    // ── Core systems ──
    const kernelRef = useRef(new SimulationKernel());
    const commRef = useRef(new CommEngine());
    const agentsRef = useRef<Map<string, AgentCore>>(new Map());

    // ── UI State ──
    const [isRunning, setIsRunning] = useState(false);
    const [tick, setTick] = useState(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [moduleStats, setModuleStats] = useState<Record<string, ModuleStats>>({
        SENSOR: { latency: 12, throughput: 98, errorRate: 0.01, active: true },
        NAV: { latency: 45, throughput: 95, errorRate: 0.00, active: true },
        CONTROL: { latency: 8, throughput: 99, errorRate: 0.02, active: true },
        COMM: { latency: 30, throughput: 80, errorRate: 0.05, active: true },
    });
    const [telemetry, setTelemetry] = useState<Record<string, TelemetryPoint[]>>({ 'UAV-704': [] });

    // ── Ground-truth ref (high-frequency canvas access) ──
    const stateRef = useRef<SimulationState>({
        drone: {
            id: 'UAV-704',
            pos: { x: 400, y: 300 },
            velocity: { x: 0, y: 0 },
            heading: 0,
            energy: 100,
            status: 'STANDBY',
            trail: [],
            altitude: 10,
        },
        obstacles: [
            { id: 'obs-1', pos: { x: 200, y: 200 }, radius: 30, type: 'static' },
            { id: 'obs-2', pos: { x: 600, y: 400 }, radius: 45, type: 'static' },
        ],
        target: { x: 700, y: 150 },
        detectedObstacles: [],
        missions: [
            {
                id: 'M-1',
                status: 'active',
                waypoints: [
                    { pos: { x: 700, y: 150 }, reached: false },
                    { pos: { x: 700, y: 500 }, reached: false },
                    { pos: { x: 100, y: 500 }, reached: false },
                    { pos: { x: 100, y: 100 }, reached: false },
                ],
            },
        ],
        dangerLevel: 'green',
        systemLoad: 0,
        altitude: 10,
        formationMode: 'OFF',
    });

    // ── Agent Initialization ──
    useEffect(() => {
        if (!agentsRef.current.has('UAV-704')) {
            const agent = new AgentCore('UAV-704', { x: 400, y: 300 });
            agent.setObstacles(stateRef.current.obstacles);
            agent.setTarget(stateRef.current.target);
            agentsRef.current.set('UAV-704', agent);
        }
    }, []);

    const addLog = useCallback((message: string, level: LogEntry['level'] = 'INFO', service = 'KERNEL') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            service,
            message,
            level,
        };
        setLogs(prev => [newLog, ...prev].slice(0, 150));
    }, []);

    const addWaypoint = useCallback((pos: { x: number; y: number }) => {
        const mission = stateRef.current.missions.find(m => m.status === 'active');
        if (mission) {
            mission.waypoints.push({ pos, reached: false });
            agentsRef.current.get('UAV-704')?.setMission(mission.waypoints.map(w => w.pos));
            addLog(`Waypoint Added at [${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}]`, 'SUCCESS');
        } else {
            // Create a new active mission if none exists
            stateRef.current.missions = [{
                id: `M-${Date.now()}`,
                status: 'active',
                waypoints: [{ pos, reached: false }]
            }];
            agentsRef.current.get('UAV-704')?.setMission([{ pos, reached: false }].map(w => w.pos));
            addLog(`New Mission Created at [${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}]`, 'SUCCESS');
        }
    }, [addLog]);

    const clearMission = useCallback(() => {
        stateRef.current.missions = [{
            id: `M-${Date.now()}`,
            status: 'active',
            waypoints: []
        }];
        agentsRef.current.get('UAV-704')?.setMission([]);
        addLog('Mission data purged', 'INFO');
    }, [addLog]);

    // ── Main Execution Loop ──
    useEffect(() => {
        let frameId: number;
        let localTick = 0;

        const loop = () => {
            if (!isRunning) return;

            const MAX_EVENTS = 8;
            for (let i = 0; i < MAX_EVENTS; i++) {
                const event = kernelRef.current.step();
                if (!event) break;

                const { payload } = event;

                if ('entityId' in payload) {
                    const agent = agentsRef.current.get(payload.entityId);
                    if (agent) {
                        // Keep agent's obstacle list up-to-date
                        agent.setObstacles(stateRef.current.obstacles);

                        const reactions = agent.onEvent(payload);
                        reactions.forEach(e => kernelRef.current.scheduleEvent(10, e));

                        // Sync ground-truth for rendering
                        const local = agent.getLocalState();
                        if (payload.entityId === 'UAV-704') {
                            stateRef.current.drone.pos = local.pos;
                            stateRef.current.drone.velocity = local.velocity;
                            stateRef.current.drone.heading = local.heading;
                            stateRef.current.drone.energy = local.energy;
                            stateRef.current.drone.trail = [
                                ...stateRef.current.drone.trail, { ...local.pos },
                            ].slice(-60);
                            stateRef.current.detectedObstacles = agent.getDetectedObstacles();

                            // Sync live processor stats to UI state
                            const procs = local.processors;
                            setModuleStats({
                                SENSOR: {
                                    latency: procs.SENSOR.latency,
                                    throughput: procs.SENSOR.throughput,
                                    errorRate: procs.SENSOR.errorRate,
                                    active: procs.SENSOR.status !== 'OFFLINE',
                                },
                                NAV: {
                                    latency: procs.NAV.latency,
                                    throughput: procs.NAV.throughput,
                                    errorRate: procs.NAV.errorRate,
                                    active: procs.NAV.status !== 'OFFLINE',
                                },
                                CONTROL: {
                                    latency: procs.CONTROL.latency,
                                    throughput: procs.CONTROL.throughput,
                                    errorRate: procs.CONTROL.errorRate,
                                    active: procs.CONTROL.status !== 'OFFLINE',
                                },
                                COMM: {
                                    latency: procs.COMM.latency,
                                    throughput: procs.COMM.throughput,
                                    errorRate: procs.COMM.errorRate,
                                    active: procs.COMM.status !== 'OFFLINE',
                                },
                            });
                        }
                    }
                }
            }

            // ── Python Research Engine: Periodic telemetry uplink ──
            if (localTick % 120 === 0 && isRunning) {
                const agents = Array.from(agentsRef.current.values()).map(a => {
                    const s = a.getLocalState();
                    return {
                        id: s.id,
                        pos: s.pos,
                        velocity: s.velocity,
                        energy: s.energy,
                        heading: s.heading,
                        processors: Object.fromEntries(
                            Object.entries(s.processors).map(([k, v]) => [k, { status: v.status, errorRate: v.errorRate }])
                        ),
                    };
                });

                fetch('http://localhost:8000/adaptation/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agents, timestamp: Date.now() }),
                })
                    .then(res => res.json())
                    .then(data => {
                        addLog(
                            `RL Optimizer: Δθ=${data.delta_theta?.toFixed(3)} [${data.regime}] proxy=${data.spectral_proxy?.toFixed(3)}`,
                            'SUCCESS', 'PYTHON_ENGINE'
                        );
                    })
                    .catch(() => { /* silent — COMM processor may be offline */ });
            }

            // ── Telemetry history for chart ──
            if (localTick % 20 === 0) {
                setTelemetry(prev => {
                    const energy = stateRef.current.drone.energy;
                    const updated = [...(prev['UAV-704'] ?? []), { timestamp: Date.now(), value: energy, metric: 'Energy' }].slice(-60);
                    return { 'UAV-704': updated };
                });
            }

            // ── Refill event queue ──
            if (kernelRef.current.getStatus().pendingEvents < 5) {
                kernelRef.current.scheduleEvent(0, { type: 'SENSOR_SCAN', entityId: 'UAV-704' });
                kernelRef.current.scheduleEvent(5, { type: 'NAV_COMPUTE', entityId: 'UAV-704' });
            }

            localTick++;
            setTick(localTick);
            frameId = requestAnimationFrame(loop);
        };

        if (isRunning) {
            frameId = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(frameId);
    }, [isRunning, addLog]);

    // ── Controller Functions ──
    const startSimulation = useCallback(() => {
        setIsRunning(true);
        addLog('Multi-Processor Kernel Initialized — 4 Processors ONLINE', 'SUCCESS');
        kernelRef.current.scheduleEvent(0, { type: 'SENSOR_SCAN', entityId: 'UAV-704' });
        kernelRef.current.scheduleEvent(5, { type: 'NAV_COMPUTE', entityId: 'UAV-704' });
    }, [addLog]);

    const stopSimulation = useCallback(() => {
        setIsRunning(false);
        addLog('Execution Suspended — All Processors Idle', 'WARNING');
    }, [addLog]);

    const resetSimulation = useCallback(() => {
        setIsRunning(false);
        kernelRef.current.clear();
        agentsRef.current.clear();
        const agent = new AgentCore('UAV-704', { x: 400, y: 300 });
        agent.setObstacles(stateRef.current.obstacles);
        agent.setTarget({ x: 700, y: 150 });
        agentsRef.current.set('UAV-704', agent);
        stateRef.current.drone.pos = { x: 400, y: 300 };
        stateRef.current.drone.trail = [];
        stateRef.current.drone.energy = 100;
        stateRef.current.detectedObstacles = [];
        stateRef.current.target = { x: 700, y: 150 };
        setTick(0);
        setLogs([]);
        setTelemetry({ 'UAV-704': [] });
        addLog('System Hard Reset — All Processors Reinitialised', 'WARNING');
    }, [addLog]);

    const setTarget = useCallback((pos: { x: number; y: number }) => {
        stateRef.current.target = pos;
        agentsRef.current.get('UAV-704')?.setTarget(pos);
        addLog(`Navigation Vector → [${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}]`);
    }, [addLog]);

    const addObstacle = useCallback((pos: { x: number; y: number }) => {
        const id = `obs-${Date.now()}`;
        const obs = { id, pos, radius: 8 + Math.random() * 10, type: 'static' as const };
        stateRef.current.obstacles.push(obs);
        agentsRef.current.get('UAV-704')?.setObstacles(stateRef.current.obstacles);
        addLog(`Obstacle Inserted at [${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}]`, 'WARNING');
    }, [addLog]);

    const clearObstacles = useCallback(() => {
        stateRef.current.obstacles = [];
        stateRef.current.detectedObstacles = [];
        agentsRef.current.get('UAV-704')?.setObstacles([]);
        addLog('All obstacles cleared', 'INFO');
    }, [addLog]);

    /** Inject a hard fault into a specific processor */
    const faultProcessor = useCallback((id: ProcessorId) => {
        agentsRef.current.get('UAV-704')?.faultProcessor(id);
        addLog(`FAULT INJECTED → ${id} PROCESSOR OFFLINE`, 'CRITICAL', id);
    }, [addLog]);

    /** Degrade a processor (partial failure) */
    const degradeProcessor = useCallback((id: ProcessorId) => {
        agentsRef.current.get('UAV-704')?.degradeProcessor(id);
        addLog(`DEGRADED → ${id} PROCESSOR PARTIAL FAILURE`, 'WARNING', id);
    }, [addLog]);

    /** Attempt processor recovery */
    const recoverProcessor = useCallback((id: ProcessorId) => {
        agentsRef.current.get('UAV-704')?.recoverProcessor(id);
        addLog(`RECOVERY INITIATED → ${id} PROCESSOR`, 'INFO', id);
    }, [addLog]);

    const startMission = useCallback(() => {
        addLog('Mission Sequence Transmitted to NAV Processor', 'SUCCESS');
    }, [addLog]);

    return {
        stateRef,
        isRunning,
        speed: 1,
        setSpeed: () => { },
        sensorRange: 250,
        setSensorRange: () => { },
        logs,
        activeModules: ['SENSOR', 'NAV', 'CONTROL', 'COMM'],
        moduleStats,
        telemetry,
        tick,
        startSimulation,
        stopSimulation,
        resetSimulation,
        setTarget,
        addObstacle,
        clearObstacles,
        addWaypoint,
        clearMission,
        startMission,
        faultProcessor,
        degradeProcessor,
        recoverProcessor,
    };
};
