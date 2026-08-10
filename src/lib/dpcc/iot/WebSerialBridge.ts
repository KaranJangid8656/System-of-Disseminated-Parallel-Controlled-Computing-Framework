/**
 * WebSerial API Bridge for DPCC IoT Integration
 * Facilitates direct USB-Serial communication between the web interface
 * and physical microcontrollers (ESP32, Arduino, STM32, Raspberry Pi Pico).
 */

export interface SerialPacket {
  processor: 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM' | 'UNKNOWN';
  type: string;
  data: Record<string, unknown>;
  raw: string;
  timestamp: number;
}

export type SerialPacketCallback = (packet: SerialPacket) => void;
export type SerialLogCallback = (log: string, level: 'info' | 'warn' | 'error' | 'rx' | 'tx') => void;

export class WebSerialBridge {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private isConnected: boolean = false;
  private onPacketCallbacks: Set<SerialPacketCallback> = new Set();
  private onLogCallbacks: Set<SerialLogCallback> = new Set();
  private buffer: string = '';
  private currentBaudRate: number = 115200;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  public async connect(baudRate: number = 115200): Promise<boolean> {
    if (!this.isSupported()) {
      this.log('WebSerial API is not supported in this browser. Use Chrome, Edge, or Opera.', 'error');
      return false;
    }

    try {
      this.currentBaudRate = baudRate;
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: this.currentBaudRate });
      this.isConnected = true;

      this.log(`Serial port connected at ${this.currentBaudRate} baud.`, 'info');
      this.startReading();
      return true;
    } catch (err: any) {
      this.log(`Failed to connect serial port: ${err?.message || err}`, 'error');
      this.isConnected = false;
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      this.log('Serial port disconnected.', 'info');
    } catch (err: any) {
      this.log(`Error during serial disconnect: ${err?.message || err}`, 'warn');
    }
  }

  private async startReading() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.isConnected) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          this.processChunk(value);
        }
      }
    } catch (err: any) {
      if (this.isConnected) {
        this.log(`Serial read error: ${err?.message || err}`, 'error');
      }
    } finally {
      if (this.reader) {
        try { this.reader.releaseLock(); } catch (e) {}
      }
    }
  }

  private processChunk(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      this.log(trimmed, 'rx');
      this.parseLine(trimmed);
    }
  }

  private parseLine(line: string) {
    let packet: SerialPacket | null = null;

    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const parsed = JSON.parse(line);
        const proc = (parsed.proc || parsed.processor || 'UNKNOWN').toUpperCase();
        packet = {
          processor: ['SENSOR', 'NAV', 'CONTROL', 'COMM'].includes(proc) ? proc : 'UNKNOWN',
          type: parsed.type || parsed.event || 'DATA',
          data: parsed,
          raw: line,
          timestamp: Date.now()
        };
      } catch (e) {
        // key-value fallback
      }
    }

    if (!packet && line.includes(':')) {
      const [header, payloadStr] = line.split(':');
      const upperHeader = header.trim().toUpperCase();
      let proc: SerialPacket['processor'] = 'UNKNOWN';
      if (upperHeader.includes('SENSOR')) proc = 'SENSOR';
      else if (upperHeader.includes('NAV')) proc = 'NAV';
      else if (upperHeader.includes('CONTROL')) proc = 'CONTROL';
      else if (upperHeader.includes('COMM')) proc = 'COMM';

      const kvPairs: Record<string, unknown> = {};
      if (payloadStr) {
        payloadStr.split(',').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k && v) {
            const num = Number(v);
            kvPairs[k.trim()] = isNaN(num) ? v.trim() : num;
          }
        });
      }

      packet = {
        processor: proc,
        type: 'KV_TELEMETRY',
        data: kvPairs,
        raw: line,
        timestamp: Date.now()
      };
    }

    if (!packet) {
      packet = {
        processor: 'UNKNOWN',
        type: 'RAW_TEXT',
        data: { message: line },
        raw: line,
        timestamp: Date.now()
      };
    }

    this.onPacketCallbacks.forEach(cb => cb(packet!));
  }

  public async sendCommand(cmd: string | object): Promise<boolean> {
    if (!this.isConnected || !this.port || !this.port.writable) {
      this.log('Cannot send command: Serial port not connected', 'warn');
      return false;
    }

    try {
      const strPayload = typeof cmd === 'object' ? JSON.stringify(cmd) : cmd;
      const textEncoder = new TextEncoder();
      this.writer = this.port.writable.getWriter();
      await this.writer.write(textEncoder.encode(strPayload + '\n'));
      this.writer.releaseLock();
      this.writer = null;

      this.log(strPayload, 'tx');
      return true;
    } catch (err: any) {
      if (this.writer) this.writer.releaseLock();
      this.log(`Failed to write serial payload: ${err?.message || err}`, 'error');
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
      baudRate: this.currentBaudRate,
      supported: this.isSupported()
    };
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'rx' | 'tx') {
    this.onLogCallbacks.forEach(cb => cb(message, level));
  }
}

export const serialBridge = new WebSerialBridge();
