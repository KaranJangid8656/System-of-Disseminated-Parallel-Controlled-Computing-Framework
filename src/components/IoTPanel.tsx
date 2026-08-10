'use client';

import React, { useState, useEffect } from 'react';
import { serialBridge, SerialPacket } from '../lib/dpcc/iot/WebSerialBridge';
import { wsBridge } from '../lib/dpcc/iot/WebSocketBridge';
import { hardwareManager, NodeMode, ProcessorHardwareConfig } from '../lib/dpcc/iot/HardwareManager';
import { ProcessorId } from '../lib/dpcc/types';

interface IoTPanelProps {
  onOpenFirmwareModal: () => void;
}

export default function IoTPanel({ onOpenFirmwareModal }: IoTPanelProps) {
  const [serialStatus, setSerialStatus] = useState(serialBridge.getStatus());
  const [wsStatus, setWsStatus] = useState(wsBridge.getStatus());
  const [wsUrlInput, setWsUrlInput] = useState('ws://192.168.1.100:81');
  const [baudRate, setBaudRate] = useState(115200);
  const [logs, setLogs] = useState<Array<{ id: string; text: string; level: string; time: string }>>([]);
  const [hwConfigs, setHwConfigs] = useState<Record<ProcessorId, ProcessorHardwareConfig>>(
    hardwareManager.getConfigs()
  );
  const [commandInput, setCommandInput] = useState('');

  useEffect(() => {
    const unsubSerialLog = serialBridge.onLog((msg, level) => {
      addLog(msg, level);
      setSerialStatus(serialBridge.getStatus());
    });

    const unsubWsLog = wsBridge.onLog((msg, level) => {
      addLog(msg, level);
      setWsStatus(wsBridge.getStatus());
    });

    const unsubPacket = serialBridge.onPacket((packet) => {
      setHwConfigs(hardwareManager.getConfigs());
    });

    return () => {
      unsubSerialLog();
      unsubWsLog();
      unsubPacket();
    };
  }, []);

  const addLog = (text: string, level: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        text,
        level,
        time: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 80),
    ]);
  };

  const handleConnectSerial = async () => {
    if (serialStatus.connected) {
      await serialBridge.disconnect();
    } else {
      await serialBridge.connect(baudRate);
    }
    setSerialStatus(serialBridge.getStatus());
  };

  const handleConnectWs = async () => {
    if (wsStatus.connected) {
      wsBridge.disconnect();
    } else {
      await wsBridge.connect(wsUrlInput);
    }
    setWsStatus(wsBridge.getStatus());
  };

  const handleModeChange = (procId: ProcessorId, mode: NodeMode) => {
    hardwareManager.setProcessorMode(procId, mode);
    setHwConfigs(hardwareManager.getConfigs());
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    if (serialStatus.connected) {
      serialBridge.sendCommand(commandInput);
    } else if (wsStatus.connected) {
      wsBridge.sendCommand(commandInput);
    } else {
      addLog('No hardware port connected. Connect USB Serial or WebSocket first.', 'warn');
    }
    setCommandInput('');
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-zinc-100 custom-scrollbar">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-lg font-bold tracking-tight text-zinc-50">IoT Hardware-In-The-Loop (HIL) Center</h2>
          </div>
          <p className="text-xs text-zinc-400">Connect microcontrollers (ESP32, Arduino, STM32) over USB Serial or WiFi WebSockets.</p>
        </div>

        <button
          type="button"
          onClick={onOpenFirmwareModal}
          className="rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/80 transition"
        >
          ⚡ View C++ Firmware Sketches
        </button>
      </div>

      {/* Connectivity Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* USB Serial Bridge (WebSerial) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-zinc-200">🔌 USB Serial Bridge (WebSerial)</h3>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${serialStatus.connected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'}`}>
              {serialStatus.connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={serialStatus.connected}
              className="bg-zinc-950 border border-zinc-700 text-xs rounded-lg p-2 text-zinc-200 focus:outline-none"
            >
              <option value={9600}>9600 Baud</option>
              <option value={57600}>57600 Baud</option>
              <option value={115200}>115200 Baud (ESP32)</option>
              <option value={921600}>921600 Baud (High Speed)</option>
            </select>

            <button
              onClick={handleConnectSerial}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                serialStatus.connected
                  ? 'bg-rose-700 hover:bg-rose-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {serialStatus.connected ? 'Disconnect USB Port' : 'Connect USB Serial'}
            </button>
          </div>

          <p className="text-[11px] text-zinc-500">
            {serialStatus.supported
              ? 'WebSerial API supported. Plug in your ESP32 or Arduino board and select port.'
              : 'WebSerial API requires Chrome, Edge, or Brave browser over HTTPS/localhost.'}
          </p>
        </div>

        {/* WiFi WebSocket Bridge */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-zinc-200">📡 Network WebSocket Bridge (WiFi)</h3>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${wsStatus.connected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'}`}>
              {wsStatus.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={wsUrlInput}
              onChange={(e) => setWsUrlInput(e.target.value)}
              disabled={wsStatus.connected}
              placeholder="ws://192.168.1.100:81"
              className="flex-1 bg-zinc-950 border border-zinc-700 text-xs rounded-lg p-2 text-zinc-200 font-mono focus:outline-none"
            />
            <button
              onClick={handleConnectWs}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                wsStatus.connected
                  ? 'bg-rose-700 hover:bg-rose-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {wsStatus.connected ? 'Disconnect' : 'Connect WS'}
            </button>
          </div>

          <p className="text-[11px] text-zinc-500">Stream telemetry over IP from ESP32 WiFi web server nodes.</p>
        </div>
      </div>

      {/* Hardware Node Matrix Configuration */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
        <h3 className="font-semibold text-sm text-zinc-200 mb-3">🧩 Hardware Node Mapping (HIL Processor Matrix)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['SENSOR', 'NAV', 'CONTROL', 'COMM'] as ProcessorId[]).map((procId) => {
            const config = hwConfigs[procId];
            return (
              <div key={procId} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-100">{procId}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${config.connected ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {config.connected ? 'LINKED' : 'SIMULATED'}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400">{config.hardwareDeviceName}</p>

                <select
                  value={config.mode}
                  onChange={(e) => handleModeChange(procId, e.target.value as NodeMode)}
                  className="bg-zinc-900 border border-zinc-700 text-[11px] rounded p-1 text-zinc-200"
                >
                  <option value="VIRTUAL">Virtual Simulation</option>
                  <option value="HARDWARE_SERIAL">Physical (USB Serial)</option>
                  <option value="HARDWARE_WS">Physical (WiFi WebSocket)</option>
                </select>

                <div className="text-[10px] text-zinc-500 font-mono flex justify-between mt-1">
                  <span>Packets: {config.packetsReceived}</span>
                  <span>{config.lastSeen ? `${Math.round((Date.now() - config.lastSeen) / 1000)}s ago` : 'Never'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Serial / Hardware Terminal */}
      <div className="flex-1 min-h-[220px] rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">🖥️ Live Serial Monitor & Commands</span>
          <span className="text-[11px] font-mono text-zinc-500">{logs.length} entries</span>
        </div>

        <form onSubmit={handleSendCommand} className="flex gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder='Send Serial JSON / AT Command (e.g. {"proc":"SENSOR","cmd":"SCAN"})...'
            className="flex-1 bg-zinc-950 border border-zinc-700 text-xs rounded-lg p-2 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white rounded-lg transition">
            TX Send
          </button>
        </form>

        <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-800 p-3 font-mono text-xs overflow-y-auto custom-scrollbar flex flex-col gap-1 max-h-[250px]">
          {logs.length === 0 ? (
            <p className="text-zinc-600 text-center py-6">No serial stream activity yet. Connect a USB or WebSocket hardware node.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 leading-tight">
                <span className="text-zinc-600 select-none">[{log.time}]</span>
                <span className={
                  log.level === 'rx' ? 'text-emerald-400' :
                  log.level === 'tx' ? 'text-cyan-400' :
                  log.level === 'error' ? 'text-rose-400 font-bold' :
                  log.level === 'warn' ? 'text-amber-400' : 'text-zinc-400'
                }>
                  {log.level === 'rx' ? 'RX ← ' : log.level === 'tx' ? 'TX → ' : ''}{log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
