import { Vector2D, AgentLocalState, DPCCEvent, EntityId, NeighborBelief, ProcessorId } from '../types';
import { SensorProcessor } from './SensorProcessor';
import { NavProcessor } from './NavProcessor';
import { ControlProcessor } from './ControlProcessor';
import { CommProcessor } from './CommProcessor';
import { hardwareManager } from '../iot/HardwareManager';

/**
 * DPCC Agent Core — Multi-Processor Reliability Framework
 *
 * Orchestrates four independent processors (SENSOR, NAV, CONTROL, COMM).
 * Integrates Hardware-In-The-Loop (HIL) telemetry streaming from physical microcontrollers.
 */
export class AgentCore {
    private static readonly WP_REACH_RADIUS = 18;

    private state: AgentLocalState;

    // Processors
    private sensor: SensorProcessor;
    private nav: NavProcessor;
    private control: ControlProcessor;
    private comm: CommProcessor;

    // Obstacles and mission list
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

        // Subscribe to HIL hardware packet feeds
        hardwareManager.onHardwareTelemetry((packet) => {
            if (packet.processor === 'CONTROL' && packet.data.vbat !== undefined) {
                // Physical hardware battery monitoring
                this.state.energy = Math.min(100, Math.max(0, ((Number(packet.data.vbat) - 9.0) / 3.6) * 100));
            }
        });
    }

    public onEvent(event: DPCCEvent): DPCCEvent[] {
        if (this.state.energy <= 0) return [];

        const reactions: DPCCEvent[] = [];

        switch (event.type) {

            case 'SENSOR_SCAN': {
                const detected = this.sensor.scan(this.state.pos, this.obstacles);
                this.state.processors = this._snapshotProcessors();
                (this.state as any).detectedObstacleIds = detected;
                break;
            }

            case 'NAV_COMPUTE': {
                const detected = (this.state as any).detectedObstacleIds as string[] ?? [];
                const detectedObstacles = this.obstacles.filter(o => detected.includes(o.id));

                if (this.missionWaypoints.length > 0) {
                    const distToTarget = Math.hypot(
                        this.state.target.x - this.state.pos.x,
                        this.state.target.y - this.state.pos.y
                    );

                    if (distToTarget < AgentCore.WP_REACH_RADIUS) {
                        const last = this.missionWaypoints.length - 1;
                        if (this.state.currentMissionIndex < last) {
                            this.state.currentMissionIndex++;
                            this.state.target = { ...this.missionWaypoints[this.state.currentMissionIndex] };
                        }
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

                if (this.state.energy < 15 && this.state.target.x !== 400) {
                    this.state.target = { x: 400, y: 300 }; // Return to launch
                }

                reactions.push({ type: 'COMM_BROADCAST', entityId: this.state.id, data: this._buildTelemetry() });
                break;
            }

            case 'COMM_BROADCAST': {
                this.comm.enqueue({
                    type: 'TELEMETRY_UPLINK',
                    payload: event.data,
                    timestamp: Date.now(),
                });
                this.comm.flush();
                this.state.processors = this._snapshotProcessors();

                // Also dispatch payload to physical COMM hardware node if attached
                hardwareManager.dispatchCommandToHardware('COMM', event.data as object);
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

    public getLocalState(): AgentLocalState {
        return { ...this.state, neighbors: new Map(this.state.neighbors) };
    }

    public setTarget(pos: Vector2D) {
        this.state.target = { ...pos };
    }

    public clearMissionWaypoints() {
        this.missionWaypoints = [];
    }

    public setObstacles(obstacles: Array<{ id: string; pos: Vector2D; radius: number }>) {
        this.obstacles = obstacles;
    }

    public setMission(waypoints: Vector2D[]) {
        this.missionWaypoints = waypoints;
        this.state.currentMissionIndex = 0;
        if (waypoints.length > 0) {
            this.state.target = { ...waypoints[0] };
        }
    }

    public getDetectedObstacles(): string[] {
        return (this.state as any).detectedObstacleIds ?? [];
    }

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
