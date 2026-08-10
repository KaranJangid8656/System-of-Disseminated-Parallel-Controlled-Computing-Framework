import { Vector2D, ProcessorHealth } from '../types';

/**
 * CONTROL PROCESSOR
 * Responsibility: Closed-loop PID control algorithm for velocity, position actuation & motor PWM signals.
 * If OFFLINE, drone cannot move (actuators cut off).
 */
export class ControlProcessor {
    readonly id = 'CONTROL' as const;
    private health: ProcessorHealth;

    // PID Parameters
    private kp: number = 0.45;
    private ki: number = 0.02;
    private kd: number = 0.15;

    private errorSumX: number = 0;
    private errorSumY: number = 0;
    private lastErrorX: number = 0;
    private lastErrorY: number = 0;

    // PWM Signals (0 - 255)
    private motorPwm: number = 0;

    // Energy constants
    private readonly ENERGY_COST_MOVE = 0.008;
    private readonly ENERGY_COST_HOVER = 0.002;
    private readonly ENERGY_COST_DEGRADED = 0.005;

    constructor() {
        this.health = {
            id: 'CONTROL', status: 'ONLINE',
            latency: 8, errorRate: 0.02, throughput: 99, load: 0.2, faultCount: 0, lastError: null,
        };
    }

    /**
     * Compute PID position/velocity actuation signal.
     */
    public computePID(targetPos: Vector2D, currentPos: Vector2D, dt: number = 0.1): Vector2D {
        if (this.health.status === 'OFFLINE') return { x: 0, y: 0 };

        const errorX = targetPos.x - currentPos.x;
        const errorY = targetPos.y - currentPos.y;

        // Accumulate integral with anti-windup clamping
        this.errorSumX = Math.max(-100, Math.min(100, this.errorSumX + errorX * dt));
        this.errorSumY = Math.max(-100, Math.min(100, this.errorSumY + errorY * dt));

        // Derivative term
        const dErrorX = (errorX - this.lastErrorX) / dt;
        const dErrorY = (errorY - this.lastErrorY) / dt;

        this.lastErrorX = errorX;
        this.lastErrorY = errorY;

        // PID output calculation
        const outputX = (this.kp * errorX) + (this.ki * this.errorSumX) + (this.kd * dErrorX);
        const outputY = (this.kp * errorY) + (this.ki * this.errorSumY) + (this.kd * dErrorY);

        const magnitude = Math.sqrt(outputX * outputX + outputY * outputY);
        this.motorPwm = Math.min(255, Math.round(magnitude * 25));

        return { x: outputX, y: outputY };
    }

    /**
     * Apply velocity command to current position.
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
            return { newPos: { ...pos }, newVelocity: { x: 0, y: 0 }, energyDelta: 0 };
        }

        const vel = commandedVelocity ?? { x: 0, y: 0 };

        const newPos: Vector2D = {
            x: pos.x + vel.x,
            y: pos.y + vel.y,
        };

        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        let energyDelta = this.ENERGY_COST_HOVER + speed * this.ENERGY_COST_MOVE;
        if (navIsOffline) energyDelta += this.ENERGY_COST_DEGRADED;

        if (this.health.status === 'DEGRADED') {
            newPos.x += (Math.random() - 0.5) * 0.8;
            newPos.y += (Math.random() - 0.5) * 0.8;
            energyDelta *= 1.4;
        }

        return { newPos, newVelocity: vel, energyDelta };
    }

    public getMotorPwm(): number { return this.motorPwm; }

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
