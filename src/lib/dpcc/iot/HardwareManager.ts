/**
 * DPCC Hardware-In-The-Loop (HIL) Manager
 * Maps incoming micro-controller serial & network telemetry to active DPCC processors.
 */

import { ProcessorId } from '../types';
import { serialBridge, SerialPacket } from './WebSerialBridge';
import { wsBridge } from './WebSocketBridge';

export type NodeMode = 'VIRTUAL' | 'HARDWARE_SERIAL' | 'HARDWARE_WS';

export interface ProcessorHardwareConfig {
  processorId: ProcessorId;
  mode: NodeMode;
  connected: boolean;
  lastSeen: number;
  packetsReceived: number;
  hardwareDeviceName: string;
}

export class HardwareManager {
  private configs: Record<ProcessorId, ProcessorHardwareConfig> = {
    SENSOR: { processorId: 'SENSOR', mode: 'VIRTUAL', connected: false, lastSeen: 0, packetsReceived: 0, hardwareDeviceName: 'ESP32-IMU-LIDAR' },
    NAV: { processorId: 'NAV', mode: 'VIRTUAL', connected: false, lastSeen: 0, packetsReceived: 0, hardwareDeviceName: 'ESP32-AStar-Nav' },
    CONTROL: { processorId: 'CONTROL', mode: 'VIRTUAL', connected: false, lastSeen: 0, packetsReceived: 0, hardwareDeviceName: 'Arduino-PID-Motor' },
    COMM: { processorId: 'COMM', mode: 'VIRTUAL', connected: false, lastSeen: 0, packetsReceived: 0, hardwareDeviceName: 'ESP32-Radio-GCS' },
  };

  private telemetryListeners: Set<(packet: SerialPacket) => void> = new Set();

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    serialBridge.onPacket((packet) => this.handleHardwarePacket(packet, 'HARDWARE_SERIAL'));
    wsBridge.onPacket((packet) => this.handleHardwarePacket(packet, 'HARDWARE_WS'));
  }

  private handleHardwarePacket(packet: SerialPacket, sourceMode: NodeMode) {
    const proc = packet.processor;
    if (proc === 'UNKNOWN') return;

    const config = this.configs[proc];
    if (config && (config.mode === sourceMode || config.mode !== 'VIRTUAL')) {
      config.connected = true;
      config.lastSeen = Date.now();
      config.packetsReceived++;

      // Dispatch packet to telemetry listeners
      this.telemetryListeners.forEach((cb) => cb(packet));
    }
  }

  public setProcessorMode(procId: ProcessorId, mode: NodeMode) {
    if (this.configs[procId]) {
      this.configs[procId].mode = mode;
      if (mode === 'VIRTUAL') {
        this.configs[procId].connected = false;
      }
    }
  }

  public onHardwareTelemetry(callback: (packet: SerialPacket) => void) {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  public getConfigs(): Record<ProcessorId, ProcessorHardwareConfig> {
    return { ...this.configs };
  }

  public dispatchCommandToHardware(procId: ProcessorId, command: string | object) {
    const config = this.configs[procId];
    if (!config || config.mode === 'VIRTUAL') return false;

    if (config.mode === 'HARDWARE_SERIAL') {
      return serialBridge.sendCommand(command);
    } else if (config.mode === 'HARDWARE_WS') {
      return wsBridge.sendCommand(command);
    }
    return false;
  }
}

export const hardwareManager = new HardwareManager();
