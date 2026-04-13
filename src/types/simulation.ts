export interface Vector2D {
    x: number;
    y: number;
}

export interface DroneState {
    pos: Vector2D;
    velocity: Vector2D;
    target: Vector2D;
    speed: number;
}

export interface Obstacle {
    id: string;
    pos: Vector2D;
    radius: number;
}

export interface SimulationState {
    drone: DroneState;
    obstacles: Obstacle[];
    target: Vector2D;
    isRunning: boolean;
    sensorRange: number;
    detectedObstacles: string[];
    logs: LogEntry[];
}

export interface LogEntry {
    id: string;
    timestamp: number;
    module: 'SYSTEM' | 'SENSOR' | 'NAV' | 'CONTROL';
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
}
