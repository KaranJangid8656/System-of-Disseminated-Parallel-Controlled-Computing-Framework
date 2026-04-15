import { ProcessorHealth } from '../types';

export interface CommPacket {
    type: 'TELEMETRY_UPLINK' | 'OPTIMIZATION_REQUEST' | 'GROUND_COMMAND';
    payload: unknown;
    timestamp: number;
}

/**
 * COMM PROCESSOR
 * Responsibility: Package telemetry and send to Ground Control Station (Python engine).
 * Uses stochastic packet drop + latency. Fault means complete radio silence.
 */
export class CommProcessor {
    readonly id = 'COMM' as const;
    private health: ProcessorHealth;
    private readonly DROP_PROB_NOMINAL = 0.05;
    private readonly MIN_LATENCY = 10;
    private readonly JITTER = 20;
    private outboundQueue: CommPacket[] = [];

    constructor() {
        this.health = {
            id: 'COMM', status: 'ONLINE',
            latency: 30, errorRate: 0.05, throughput: 80, load: 0.25, faultCount: 0, lastError: null,
        };
    }

    /**
     * Enqueue a packet for transmission.
     */
    public enqueue(packet: CommPacket) {
        this.outboundQueue.push(packet);
    }

    /**
     * Flush queue — simulate transmission.
     * Returns packets that "got through" (not dropped).
     */
    public flush(): { delivered: CommPacket[]; dropped: number; latency: number } {
        this._tickHealth();
        if (this.health.status === 'OFFLINE') {
            const dropped = this.outboundQueue.length;
            this.outboundQueue = [];
            return { delivered: [], dropped, latency: 0 };
        }

        const dropProb = this.health.status === 'DEGRADED'
            ? this.DROP_PROB_NOMINAL * 5  // 25% loss when degraded
            : this.DROP_PROB_NOMINAL;

        const delivered: CommPacket[] = [];
        let dropped = 0;

        for (const pkt of this.outboundQueue) {
            if (Math.random() > dropProb) {
                delivered.push(pkt);
            } else {
                dropped++;
            }
        }

        const latency = this.MIN_LATENCY + Math.random() * this.JITTER;
        this.outboundQueue = [];
        return { delivered, dropped, latency };
    }

    public injectFault() {
        this.health.status = 'OFFLINE';
        this.health.errorRate = 1.0;
        this.health.throughput = 0;
        this.health.faultCount++;
        this.health.lastError = 'RF_LINK_LOSS';
        this.outboundQueue = [];
    }

    public degrade() {
        this.health.status = 'DEGRADED';
        this.health.errorRate = 0.40;
        this.health.throughput = 30;
        this.health.faultCount++;
        this.health.lastError = 'HIGH_INTERFERENCE';
    }

    public recover() {
        this.health.status = 'RECOVERING';
        setTimeout(() => {
            this.health.status = 'ONLINE';
            this.health.errorRate = 0.05;
            this.health.throughput = 80;
            this.health.lastError = null;
        }, 1500);
    }

    public getHealth(): ProcessorHealth { return { ...this.health }; }

    private _tickHealth() {
        if (this.health.status === 'ONLINE') {
            this.health.latency = 20 + Math.random() * 30;
            this.health.load = 0.2 + Math.random() * 0.15;
        } else if (this.health.status === 'DEGRADED') {
            this.health.latency = 150 + Math.random() * 200;
            this.health.load = 0.85 + Math.random() * 0.15;
        }
    }
}
