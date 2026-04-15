import { SimulationEvent, DPCCEvent } from '../types';

/**
 * DPCC Simulation Kernel
 * Implements Rule 2.1: All state changes must be event-triggered via a min-heap event queue.
 */
export class SimulationKernel {
    private eventQueue: SimulationEvent[] = [];
    private currentTime: number = 0;
    private eventCounter: number = 0;

    constructor() { }

    public scheduleEvent(timeOffset: number, payload: DPCCEvent, priority: number = 0) {
        const scheduledTime = this.currentTime + timeOffset;
        const id = `EVT-${this.eventCounter++}`;

        this.eventQueue.push({
            id,
            scheduledTime,
            payload,
            priority
        });

        // Keep queue sorted by time (simple implementation for now, min-heap would be faster for large swarms)
        this.eventQueue.sort((a, b) => a.scheduledTime - b.scheduledTime || b.priority - a.priority);
    }

    public step(): SimulationEvent | null {
        if (this.eventQueue.length === 0) return null;

        const event = this.eventQueue.shift()!;
        this.currentTime = event.scheduledTime;
        return event;
    }

    public getCurrentTime(): number {
        return this.currentTime;
    }

    public clear() {
        this.eventQueue = [];
        this.currentTime = 0;
    }

    public getStatus() {
        return {
            time: this.currentTime,
            pendingEvents: this.eventQueue.length
        };
    }
}
