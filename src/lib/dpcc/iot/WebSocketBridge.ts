/**
 * WebSocket Bridge for DPCC IoT Integration
 * Enables real-time network streaming with WiFi-enabled microcontrollers (ESP32 / ESP8266)
 * or local Hardware Gateway Servers.
 */

import { SerialPacket, SerialPacketCallback, SerialLogCallback } from './WebSerialBridge';

export class WebSocketBridge {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private url: string = 'ws://192.168.1.100:81';
  private onPacketCallbacks: Set<SerialPacketCallback> = new Set();
  private onLogCallbacks: Set<SerialLogCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;

  public connect(url: string = 'ws://192.168.1.100:81'): Promise<boolean> {
    this.url = url;
    return new Promise((resolve) => {
      try {
        this.log(`Connecting to IoT WebSocket endpoint: ${this.url}...`, 'info');
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.log(`WebSocket connected to ${this.url}`, 'info');
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (err) => {
          this.log(`WebSocket error: Connection refused or network unreachable.`, 'error');
          this.isConnected = false;
          resolve(false);
        };

        this.ws.onclose = () => {
          this.log(`WebSocket connection closed.`, 'warn');
          this.isConnected = false;
        };
      } catch (err: any) {
        this.log(`WebSocket initialization error: ${err?.message || err}`, 'error');
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.log('WebSocket disconnected by user.', 'info');
  }

  private handleMessage(data: string) {
    const trimmed = data.trim();
    if (!trimmed) return;

    this.log(trimmed, 'rx');

    let packet: SerialPacket | null = null;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        const proc = (parsed.proc || parsed.processor || 'UNKNOWN').toUpperCase();
        packet = {
          processor: ['SENSOR', 'NAV', 'CONTROL', 'COMM'].includes(proc) ? proc : 'UNKNOWN',
          type: parsed.type || 'DATA',
          data: parsed,
          raw: trimmed,
          timestamp: Date.now()
        };
      } catch (e) {
        // payload fallback
      }
    }

    if (!packet) {
      packet = {
        processor: 'UNKNOWN',
        type: 'RAW_SOCKET',
        data: { payload: trimmed },
        raw: trimmed,
        timestamp: Date.now()
      };
    }

    this.onPacketCallbacks.forEach(cb => cb(packet!));
  }

  public sendCommand(cmd: string | object): boolean {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send: WebSocket is not open', 'warn');
      return false;
    }

    try {
      const payload = typeof cmd === 'object' ? JSON.stringify(cmd) : cmd;
      this.ws.send(payload);
      this.log(payload, 'tx');
      return true;
    } catch (err: any) {
      this.log(`WebSocket send error: ${err?.message || err}`, 'error');
      return false;
    }
  }

  public onPacket(callback: SerialPacketCallback) {
    this.onPacketCallbacks.add(callback);
    return () => this.onPacketCallbacks.delete(callback);
  }

  public onLog(callback: SerialLogCallback) {
    this.onLogCallbacks.add(callback);
    return () => this.onLogCallbacks.delete(callback);
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      url: this.url
    };
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'rx' | 'tx') {
    this.onLogCallbacks.forEach(cb => cb(message, level));
  }
}

export const wsBridge = new WebSocketBridge();
