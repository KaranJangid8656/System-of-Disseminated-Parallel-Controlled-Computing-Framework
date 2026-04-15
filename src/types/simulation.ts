/**
 * Unified Simulation Types for DPCC Command Center
 * High-fidelity, research-grade definitions.
 */

export interface Vector2D {
    x: number;
    y: number;
}

export interface DroneState {
    id: string;
    pos: Vector2D;
    velocity: Vector2D;
    heading: number;
    energy: number;
    status: string;
    trail: Vector2D[];
    altitude: number;
}

export interface Obstacle {
    id: string;
    pos: Vector2D;
    radius: number;
    type: 'static' | 'dynamic';
}

export interface Mission {
    id: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    waypoints: Array<{ pos: Vector2D; reached: boolean }>;
}

export interface SimulationState {
    drone: DroneState;
    obstacles: Obstacle[];
    target: Vector2D;
    detectedObstacles: string[];
    missions: Mission[];
    threatLevel: 'green' | 'yellow' | 'orange' | 'red';
    systemLoad: number;
    altitude: number;
    formationMode: string;
}

export interface LogEntry {
    id: string;
    timestamp: number;
    service: string;
    message: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'CRITICAL';
}

export interface ModuleStats {
    latency: number;
    throughput: number;
    errorRate: number;
    active: boolean;
}

export interface TelemetryPoint {
    timestamp: number;
    value: number;
    metric: string;
}
