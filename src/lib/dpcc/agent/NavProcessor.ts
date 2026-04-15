import { Vector2D, ProcessorHealth } from '../types';

interface SensorData {
    detectedObstacles: Array<{ id: string; pos: Vector2D; radius: number }>;
}

/**
 * NAV PROCESSOR
 * Responsibility: Compute steering vector toward target while avoiding obstacles.
 * Falls back to hover-in-place if OFFLINE.
 */
export class NavProcessor {
    readonly id = 'NAV' as const;
    private health: ProcessorHealth;
    private readonly MAX_SPEED = 3.5;
    private readonly SAFE_MARGIN = 40; // pixels clearance from obstacle edge

    constructor() {
        this.health = {
            id: 'NAV', status: 'ONLINE',
            latency: 45, errorRate: 0.00, throughput: 95, load: 0.35, faultCount: 0, lastError: null,
        };
    }

    /**
     * Compute a new velocity vector. Returns null if processor is OFFLINE (hover intent).
     */
    public compute(
        pos: Vector2D,
        currentVelocity: Vector2D,
        target: Vector2D,
        sensorData: SensorData
    ): Vector2D | null {
        this._tickHealth();
        if (this.health.status === 'OFFLINE') return null;

        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) return { x: 0, y: 0 };

        // Base attraction toward target
        let vx = (dx / dist) * this.MAX_SPEED;
        let vy = (dy / dist) * this.MAX_SPEED;

        // Obstacle repulsion (only when sensor data is available)
        if (this.health.status === 'ONLINE') {
            for (const obs of sensorData.detectedObstacles) {
                const ex = pos.x - obs.pos.x;
                const ey = pos.y - obs.pos.y;
                const eDist = Math.sqrt(ex * ex + ey * ey);
                const clearance = obs.radius + this.SAFE_MARGIN;
                if (eDist < clearance && eDist > 0.1) {
                    const force = (clearance / eDist) ** 2;
                    vx += (ex / eDist) * force * 2;
                    vy += (ey / eDist) * force * 2;
                }
            }
        }

        // Velocity instability damping
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > this.MAX_SPEED) {
            vx = (vx / speed) * this.MAX_SPEED;
            vy = (vy / speed) * this.MAX_SPEED;
        }

        // DEGRADED: add noise to heading
        if (this.health.status === 'DEGRADED') {
            vx += (Math.random() - 0.5) * 1.5;
            vy += (Math.random() - 0.5) * 1.5;
        }

        return { x: vx, y: vy };
    }

    public injectFault() {
        this.health.status = 'OFFLINE';
        this.health.errorRate = 1.0;
        this.health.throughput = 0;
        this.health.faultCount++;
        this.health.lastError = 'NAV_CPU_FAULT';
    }

    public degrade() {
        this.health.status = 'DEGRADED';
        this.health.errorRate = 0.25;
        this.health.throughput = 50;
        this.health.faultCount++;
        this.health.lastError = 'IMU_PARTIAL_LOSS';
    }

    public recover() {
        this.health.status = 'RECOVERING';
        setTimeout(() => {
            this.health.status = 'ONLINE';
            this.health.errorRate = 0.00;
            this.health.throughput = 95;
            this.health.lastError = null;
        }, 3000);
    }

    public getHealth(): ProcessorHealth { return { ...this.health }; }

    private _tickHealth() {
        if (this.health.status === 'ONLINE') {
            this.health.latency = 35 + Math.random() * 20;
            this.health.load = 0.3 + Math.random() * 0.15;
        } else if (this.health.status === 'DEGRADED') {
            this.health.latency = 120 + Math.random() * 80;
            this.health.load = 0.85 + Math.random() * 0.15;
        }
    }
}
