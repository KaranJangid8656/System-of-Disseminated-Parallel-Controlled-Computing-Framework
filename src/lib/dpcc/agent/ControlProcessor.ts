import { Vector2D, ProcessorHealth } from '../types';

/**
 * CONTROL PROCESSOR
 * Responsibility: Apply velocity to position & enforce energy depletion physics.
 * If OFFLINE, drone cannot move (motors dead).
 */
export class ControlProcessor {
    readonly id = 'CONTROL' as const;
    private health: ProcessorHealth;

    // Energy constants (units per frame)
    private readonly ENERGY_COST_MOVE = 0.01;      // per unit of speed (reduced from 0.04)
    private readonly ENERGY_COST_HOVER = 0.002;    // idle but airborne (reduced from 0.008)
    private readonly ENERGY_COST_DEGRADED = 0.005; // extra overhead when nav is down

    constructor() {
        this.health = {
            id: 'CONTROL', status: 'ONLINE',
            latency: 8, errorRate: 0.02, throughput: 99, load: 0.2, faultCount: 0, lastError: null,
        };
    }

    /**
     * Apply velocity command to current position.
     * Returns { newPos, newVelocity, energyDelta }.
     * If OFFLINE, returns current pos with zero velocity (drone frozen).
     */
    public apply(
        pos: Vector2D,
        velocity: Vector2D,
        commandedVelocity: Vector2D | null,
        currentEnergy: number,
        navIsOffline: boolean
    ): { newPos: Vector2D; newVelocity: Vector2D; energyDelta: number } {
        this._tickHealth();

        if (this.health.status === 'OFFLINE' || currentEnergy <= 0) {
            // Motors dead – no movement, still consume tiny residual
            return { newPos: { ...pos }, newVelocity: { x: 0, y: 0 }, energyDelta: 0 };
        }

        // Use commanded velocity if available, else hover (zero)
        const vel = commandedVelocity ?? { x: 0, y: 0 };

        const newPos: Vector2D = {
            x: pos.x + vel.x,
            y: pos.y + vel.y,
        };

        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        let energyDelta = this.ENERGY_COST_HOVER + speed * this.ENERGY_COST_MOVE;
        if (navIsOffline) energyDelta += this.ENERGY_COST_DEGRADED; // extra overhead from fallback mode

        if (this.health.status === 'DEGRADED') {
            // Shaky actuators — random jitter
            newPos.x += (Math.random() - 0.5) * 0.8;
            newPos.y += (Math.random() - 0.5) * 0.8;
            energyDelta *= 1.4; // thruster inefficiency
        }

        return { newPos, newVelocity: vel, energyDelta };
    }

    public injectFault() {
        this.health.status = 'OFFLINE';
        this.health.errorRate = 1.0;
        this.health.throughput = 0;
        this.health.faultCount++;
        this.health.lastError = 'MOTOR_CONTROLLER_FAILURE';
    }

    public degrade() {
        this.health.status = 'DEGRADED';
        this.health.errorRate = 0.15;
        this.health.throughput = 60;
        this.health.faultCount++;
        this.health.lastError = 'ESC_OVERCURRENT';
    }

    public recover() {
        this.health.status = 'RECOVERING';
        setTimeout(() => {
            this.health.status = 'ONLINE';
            this.health.errorRate = 0.02;
            this.health.throughput = 99;
            this.health.lastError = null;
        }, 2500);
    }

    public getHealth(): ProcessorHealth { return { ...this.health }; }

    private _tickHealth() {
        if (this.health.status === 'ONLINE') {
            this.health.latency = 6 + Math.random() * 6;
            this.health.load = 0.15 + Math.random() * 0.12;
        } else if (this.health.status === 'DEGRADED') {
            this.health.latency = 30 + Math.random() * 30;
            this.health.load = 0.8 + Math.random() * 0.2;
        }
    }
}
