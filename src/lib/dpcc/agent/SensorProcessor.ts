import { Vector2D, ProcessorHealth } from '../types';

/**
 * SENSOR PROCESSOR
 * Responsibility: Scan local environment for obstacles within range.
 * Can be degraded or killed independently.
 */
export class SensorProcessor {
    readonly id = 'SENSOR' as const;
    private health: ProcessorHealth;
    private readonly BASE_RANGE = 250;

    constructor() {
        this.health = {
            id: 'SENSOR', status: 'ONLINE',
            latency: 12, errorRate: 0.01, throughput: 98, load: 0.15, faultCount: 0, lastError: null,
        };
    }

    /**
     * Scan for obstacles from the drone's current position.
     * Returns list of detected obstacle IDs. Returns empty array if OFFLINE.
     */
    public scan(
        dronePos: Vector2D,
        obstacles: Array<{ id: string; pos: Vector2D; radius: number }>
    ): string[] {
        this._tickHealth();
        if (this.health.status === 'OFFLINE') return [];

        const range = this.health.status === 'DEGRADED' ? this.BASE_RANGE * 0.4 : this.BASE_RANGE;

        return obstacles
            .filter(obs => {
                const dx = obs.pos.x - dronePos.x;
                const dy = obs.pos.y - dronePos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist < range + obs.radius;
            })
            .map(obs => obs.id);
    }

    public injectFault() {
        this.health.status = 'OFFLINE';
        this.health.errorRate = 1.0;
        this.health.throughput = 0;
        this.health.faultCount++;
        this.health.lastError = 'SENSOR_ARRAY_FAILURE';
    }

    public degrade() {
        this.health.status = 'DEGRADED';
        this.health.errorRate = 0.35;
        this.health.throughput = 40;
        this.health.faultCount++;
        this.health.lastError = 'PARTIAL_ARRAY_LOSS';
    }

    public recover() {
        this.health.status = 'RECOVERING';
        setTimeout(() => {
            this.health.status = 'ONLINE';
            this.health.errorRate = 0.01;
            this.health.throughput = 98;
            this.health.lastError = null;
        }, 2000);
    }

    public getHealth(): ProcessorHealth { return { ...this.health }; }

    private _tickHealth() {
        if (this.health.status === 'ONLINE') {
            this.health.latency = 10 + Math.random() * 8;
            this.health.load = 0.1 + Math.random() * 0.15;
        } else if (this.health.status === 'DEGRADED') {
            this.health.latency = 40 + Math.random() * 40;
            this.health.load = 0.7 + Math.random() * 0.3;
        }
    }
}
