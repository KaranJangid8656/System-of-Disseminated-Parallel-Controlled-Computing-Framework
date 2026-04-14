export interface Vector2D {
    x: number;
    y: number;
}

export interface DroneState {
    id: string;
    pos: Vector2D;
    velocity: Vector2D;
    target: Vector2D;
    speed: number;
    health: number;
    battery: number;
    altitude: number;
    heading: number; // degrees
    status: 'idle' | 'navigating' | 'avoiding' | 'holding' | 'waypoint_seek' | 'mission_complete' | 'returning';
    trail: Vector2D[];
    signalStrength: number;
    totalDistanceTraveled: number;
}

export interface Obstacle {
    id: string;
    pos: Vector2D;
    radius: number;
    type: 'static' | 'dynamic';
    velocity?: Vector2D;
    label?: string;
}

export interface Waypoint {
    id: string;
    pos: Vector2D;
    label: string;
    reached: boolean;
    reachedAt?: number;
}

export interface Mission {
    id: string;
    name: string;
    description: string;
    waypoints: Waypoint[];
    status: 'pending' | 'active' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SimulationState {
    drone: DroneState;
    obstacles: Obstacle[];
    target: Vector2D;
    isRunning: boolean;
    sensorRange: number;
    detectedObstacles: string[];
    logs: LogEntry[];
    missions: Mission[];
    activeMissionIndex: number;
    tick: number;
    elapsedTime: number;
    threatLevel: 'green' | 'yellow' | 'orange' | 'red';
    pathHistory: Vector2D[];
}

export interface LogEntry {
    id: string;
    timestamp: number;
    module: 'SYSTEM' | 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM' | 'MISSION';
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'critical';
}

export interface ModuleStats {
    name: string;
    executions: number;
    avgLatency: number;
    load: number;
    frequency: string;
    description: string;
}

export interface TelemetryPoint {
    time: number;
    value: number;
}
