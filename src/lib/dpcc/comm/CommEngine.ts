import { EntityId, DPCCEvent } from '../types';

/**
 * DPCC Communication Engine
 * Rule 2.2: Scheduled communication with stochastic drops and latency.
 */
export class CommEngine {
    private readonly DROP_PROBABILITY = 0.05; // 5% packet loss
    private readonly MIN_LATENCY = 10; // ms
    private readonly JITTER = 20; // ms

    constructor() { }

    /**
     * Rule 2.3: Silent Discard Enforcement
     * Randomly decide if a packet is dropped.
     */
    public processMessage(fromId: EntityId, toId: EntityId, payload: any): { delay: number, event: DPCCEvent } | null {
        if (Math.random() < this.DROP_PROBABILITY) {
            console.log(`[COMM] Packet dropped: ${fromId} -> ${toId}`);
            return null; // Silent discard
        }

        const latency = this.MIN_LATENCY + Math.random() * this.JITTER;

        return {
            delay: latency,
            event: {
                type: 'PACKET_RECEIVE',
                fromId,
                toId,
                payload
            }
        };
    }
}
