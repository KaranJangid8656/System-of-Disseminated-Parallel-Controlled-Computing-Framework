import { Vector2D, AgentLocalState, DPCCEvent, EntityId, NeighborBelief, ProcessorId } from '../types';
import { SensorProcessor } from './SensorProcessor';
import { NavProcessor } from './NavProcessor';
import { ControlProcessor } from './ControlProcessor';
import { CommProcessor } from './CommProcessor';

/**
 * DPCC Agent Core — Multi-Processor Reliability Framework
 *
 * Orchestrates four independent processors (SENSOR, NAV, CONTROL, COMM).
 * Each processor can be independently faulted, degraded, or recovered to
 * simulate real-world processor redundancy and reliability analysis.
 *
 * Rule 1.1: No Global State Access — only local state is read/written here.
 */
export class AgentCore {
    private state: AgentLocalState;

    // ── Independent Processors ──
    private sensor: SensorProcessor;
    private nav: NavProcessor;
    private control: ControlProcessor;
    private comm: CommProcessor;

    // Cached obstacle and mission list injected by the kernel each tick
    private obstacles: Array<{ id: string; pos: Vector2D; radius: number }> = [];
    private missionWaypoints: Vector2D[] = [];

    constructor(id: EntityId, initialPos: Vector2D) {
        this.sensor = new SensorProcessor();
        this.nav = new NavProcessor();
        this.control = new ControlProcessor();
        this.comm = new CommProcessor();

        this.state = {
            id,
            pos: { ...initialPos },
            velocity: { x: 0, y: 0 },
            target: { ...initialPos },
            energy: 100,
            heading: 0,
            neighbors: new Map<EntityId, NeighborBelief>(),
            currentMissionIndex: 0,
            processors: this._snapshotProcessors(),
        };
    }

    // ────────────────────────────────────────────────────────────────
    //  Public Event Interface (Rule 2.1)
    // ────────────────────────────────────────────────────────────────

    public onEvent(event: DPCCEvent): DPCCEvent[] {
        if (this.state.energy <= 0) return [];

        const reactions: DPCCEvent[] = [];

        switch (event.type) {

            case 'SENSOR_SCAN': {
                // SENSOR PROCESSOR runs first: determines what the drone "sees"
                const detected = this.sensor.scan(this.state.pos, this.obstacles);
                this.state.processors = this._snapshotProcessors();
                // Push detection list into state for rendering
                (this.state as any).detectedObstacleIds = detected;
                break;
            }

            case 'NAV_COMPUTE': {
                // NAV PROCESSOR uses sensor output to compute steering
                const detected = (this.state as any).detectedObstacleIds as string[] ?? [];
                const detectedObstacles = this.obstacles.filter(o => detected.includes(o.id));

                // Mission logic: Auto-advance to next waypoint if current target reached
                if (this.missionWaypoints.length > 0) {
                    const distToTarget = Math.sqrt(
                        (this.state.target.x - this.state.pos.x) ** 2 +
                        (this.state.target.y - this.state.pos.y) ** 2
                    );

                    if (distToTarget < 15) { // Reach radius
                        this.state.currentMissionIndex = (this.state.currentMissionIndex + 1) % this.missionWaypoints.length;
                        this.state.target = { ...this.missionWaypoints[this.state.currentMissionIndex] };
                    }
                }

                const cmdVelocity = this.nav.compute(
                    this.state.pos,
                    this.state.velocity,
                    this.state.target,
                    { detectedObstacles }
                );
                (this.state as any).commandedVelocity = cmdVelocity;
                this.state.processors = this._snapshotProcessors();

                reactions.push({ type: 'CONTROL_APPLY', entityId: this.state.id });
                break;
            }

            case 'CONTROL_APPLY': {
                // CONTROL PROCESSOR applies velocity → position + energy cost
                const cmdVel = (this.state as any).commandedVelocity as Vector2D | null;
                const navOffline = this.nav.getHealth().status === 'OFFLINE';

                const { newPos, newVelocity, energyDelta } = this.control.apply(
                    this.state.pos,
                    this.state.velocity,
                    cmdVel,
                    this.state.energy,
                    navOffline
                );

                this.state.pos = newPos;
                this.state.velocity = newVelocity;
                this.state.heading = newVelocity.x !== 0 || newVelocity.y !== 0
                    ? Math.atan2(newVelocity.y, newVelocity.x) * (180 / Math.PI)
                    : this.state.heading;

                this.state.energy = Math.max(0, this.state.energy - energyDelta);
                this.state.processors = this._snapshotProcessors();

                // RTL if critically low energy
                if (this.state.energy < 15 && this.state.target.x !== 400) {
                    this.state.target = { x: 400, y: 300 }; // Return to launch
                }

                // Schedule COMM uplink
                reactions.push({ type: 'COMM_BROADCAST', entityId: this.state.id, data: this._buildTelemetry() });
                break;
            }

            case 'COMM_BROADCAST': {
                // COMM PROCESSOR handles uplink to GCS
                this.comm.enqueue({
                    type: 'TELEMETRY_UPLINK',
                    payload: event.data,
                    timestamp: Date.now(),
                });
                this.comm.flush(); // attempt transmission
                this.state.processors = this._snapshotProcessors();
                break;
            }

            case 'ENERGY_DECAY': {
                this.state.energy = Math.max(0, this.state.energy - event.amount);
                break;
            }

            case 'PACKET_RECEIVE': {
                this._updateBelief(event.fromId as EntityId, event.payload);
                break;
            }

            case 'PROCESSOR_FAULT': {
                this._faultProcessor(event.processorId);
                this.state.processors = this._snapshotProcessors();
                break;
            }

            case 'PROCESSOR_RECOVER': {
                this._recoverProcessor(event.processorId);
                this.state.processors = this._snapshotProcessors();
                break;
            }
        }

        return reactions;
    }

    // ────────────────────────────────────────────────────────────────
    //  Fault Injection API (called from UI or kernel)
    // ────────────────────────────────────────────────────────────────

    public faultProcessor(id: ProcessorId) {
        this._faultProcessor(id);
        this.state.processors = this._snapshotProcessors();
    }

    public degradeProcessor(id: ProcessorId) {
        this._degradeProcessor(id);
        this.state.processors = this._snapshotProcessors();
    }

    public recoverProcessor(id: ProcessorId) {
        this._recoverProcessor(id);
        this.state.processors = this._snapshotProcessors();
    }

    // ────────────────────────────────────────────────────────────────
    //  Accessors
    // ────────────────────────────────────────────────────────────────

    public getLocalState(): AgentLocalState {
        return { ...this.state, neighbors: new Map(this.state.neighbors) };
    }

    public setTarget(pos: Vector2D) {
        this.state.target = { ...pos };
    }

    public setObstacles(obstacles: Array<{ id: string; pos: Vector2D; radius: number }>) {
        this.obstacles = obstacles;
    }

    public setMission(waypoints: Vector2D[]) {
        this.missionWaypoints = waypoints;
        if (waypoints.length > 0) {
            this.state.target = { ...waypoints[0] };
            this.state.currentMissionIndex = 0;
        }
    }

    public getDetectedObstacles(): string[] {
        return (this.state as any).detectedObstacleIds ?? [];
    }

    // ────────────────────────────────────────────────────────────────
    //  Private Helpers
    // ────────────────────────────────────────────────────────────────

    private _faultProcessor(id: ProcessorId) {
        if (id === 'SENSOR') this.sensor.injectFault();
        else if (id === 'NAV') this.nav.injectFault();
        else if (id === 'CONTROL') this.control.injectFault();
        else if (id === 'COMM') this.comm.injectFault();
    }

    private _degradeProcessor(id: ProcessorId) {
        if (id === 'SENSOR') this.sensor.degrade();
        else if (id === 'NAV') this.nav.degrade();
        else if (id === 'CONTROL') this.control.degrade();
        else if (id === 'COMM') this.comm.degrade();
    }

    private _recoverProcessor(id: ProcessorId) {
        if (id === 'SENSOR') this.sensor.recover();
        else if (id === 'NAV') this.nav.recover();
        else if (id === 'CONTROL') this.control.recover();
        else if (id === 'COMM') this.comm.recover();
    }

    private _updateBelief(id: EntityId, telemetry: any) {
        this.state.neighbors.set(id, {
            id, lastKnownPos: telemetry.pos, lastSeenAt: Date.now(), stale: false,
        });
    }

    private _snapshotProcessors() {
        return {
            SENSOR: this.sensor.getHealth(),
            NAV: this.nav.getHealth(),
            CONTROL: this.control.getHealth(),
            COMM: this.comm.getHealth(),
        };
    }

    private _buildTelemetry() {
        return {
            id: this.state.id,
            pos: this.state.pos,
            velocity: this.state.velocity,
            energy: this.state.energy,
            heading: this.state.heading,
            timestamp: Date.now(),
            processors: this._snapshotProcessors(),
        };
    }
}
