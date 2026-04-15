/**
 * DPCC System Types - Multi-Processor Reliability Framework
 * Simulates intra-drone parallel processing with fault injection.
 */

export type Vector2D = { x: number; y: number };
export type EntityId = string;
export type ProcessorId = 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM';

export type ProcessorStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'RECOVERING';

export interface ProcessorHealth {
    id: ProcessorId;
    status: ProcessorStatus;
    latency: number;        // ms, simulated processing time
    errorRate: number;      // 0.0 – 1.0
    throughput: number;     // 0 – 100 %
    load: number;           // 0.0 – 1.0
    faultCount: number;     // cumulative
    lastError: string | null;
}

export interface Telemetry {
    id: EntityId;
    pos: Vector2D;
    velocity: Vector2D;
    energy: number;
    heading: number;
    status: string;
    timestamp: number;
    processors: Record<ProcessorId, ProcessorHealth>;
}

/** Internal inter-processor message bus message */
export interface BusMessage {
    from: ProcessorId;
    to: ProcessorId;
    type: string;
    payload: unknown;
    tick: number;
}

export type DPCCEvent =
    | { type: 'TICK'; time: number }
    | { type: 'SENSOR_SCAN'; entityId: EntityId }
    | { type: 'NAV_COMPUTE'; entityId: EntityId }
    | { type: 'CONTROL_APPLY'; entityId: EntityId }
    | { type: 'COMM_BROADCAST'; entityId: EntityId; data: unknown }
    | { type: 'PACKET_RECEIVE'; toId: EntityId; fromId: EntityId; payload: unknown }
    | { type: 'ENERGY_DECAY'; entityId: EntityId; amount: number }
    | { type: 'MISSION_UPDATE'; entityId: EntityId; waypointIdx: number }
    | { type: 'PROCESSOR_FAULT'; entityId: EntityId; processorId: ProcessorId }
    | { type: 'PROCESSOR_RECOVER'; entityId: EntityId; processorId: ProcessorId };

export interface SimulationEvent {
    id: string;
    scheduledTime: number;
    payload: DPCCEvent;
    priority: number;
}

/** Agent Belief State - Fog of War */
export interface NeighborBelief {
    id: EntityId;
    lastKnownPos: Vector2D;
    lastSeenAt: number;
    stale: boolean;
}

export interface AgentLocalState {
    id: EntityId;
    pos: Vector2D;
    velocity: Vector2D;
    target: Vector2D;
    energy: number;
    heading: number;
    neighbors: Map<EntityId, NeighborBelief>;
    currentMissionIndex: number;
    processors: Record<ProcessorId, ProcessorHealth>;
}
