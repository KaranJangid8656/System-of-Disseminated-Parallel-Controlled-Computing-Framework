'use client';

import React, { useState } from 'react';
import { useSimulationEngine } from '../hooks/useSimulationEngine';
import Canvas from '../components/Canvas';
import ProcessorDetailOverlay from '../components/ProcessorDetailOverlay';
import IoTPanel from '../components/IoTPanel';
import FirmwareModal from '../components/FirmwareModal';

type ProcessorId = 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM';
type ActiveTab = 'SIMULATION' | 'IOT_HARDWARE';

const PROCESSORS: ProcessorId[] = ['SENSOR', 'NAV', 'CONTROL', 'COMM'];

const levelStyle: Record<string, string> = {
  INFO: 'text-zinc-300 bg-zinc-900/80 border-zinc-800',
  WARNING: 'text-amber-300 bg-amber-950/40 border-amber-800/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
  ERROR: 'text-rose-300 bg-rose-950/40 border-rose-800/60 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
  SUCCESS: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
  CRITICAL: 'text-purple-300 bg-purple-950/40 border-purple-800/60 shadow-[0_0_10px_rgba(168,85,247,0.1)]',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('SIMULATION');
  const [showFirmwareModal, setShowFirmwareModal] = useState(false);
  const [selectedProcessor, setSelectedProcessor] = useState<ProcessorId | null>(null);

  const {
    stateRef,
    isRunning,
    sensorRange,
    logs,
    activeModules,
    moduleStats,
    telemetry,
    tick,
    startSimulation,
    stopSimulation,
    resetSimulation,
    setTarget,
    addObstacle,
    clearObstacles,
    addWaypoint,
    clearMission,
    startMission,
    faultProcessor,
    degradeProcessor,
    recoverProcessor,
  } = useSimulationEngine();

  const handleCanvasClick = (pos: { x: number; y: number }, rightClick?: boolean, shiftClick?: boolean) => {
    if (rightClick) setTarget(pos);
    else if (shiftClick) addWaypoint(pos);
    else addObstacle(pos);
  };

  const drone = stateRef.current.drone;
  const mission = stateRef.current.missions.find((m) => m.status === 'active');
  const waypointsTotal = mission?.waypoints.length ?? 0;
  const waypointsDone = mission?.waypoints.filter((wp) => wp.reached).length ?? 0;
  const target = stateRef.current.target;

  const distToTarget = Math.hypot(target.x - drone.pos.x, target.y - drone.pos.y);
  const speed = Math.hypot(drone.velocity.x, drone.velocity.y);
  const pwmOutput = Math.min(255, Math.round(speed * 180));
  const pidError = (distToTarget * 0.015).toFixed(3);

  return (
    <div className="relative flex h-screen max-h-screen flex-col gap-3 overflow-hidden bg-[#040507] p-3 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Background ambient lighting blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.12),transparent_45%)]" />

      {/* Firmware Modal */}
      <FirmwareModal isOpen={showFirmwareModal} onClose={() => setShowFirmwareModal(false)} />

      {/* Detailed Processor Inspector Overlay */}
      {selectedProcessor && (
        <div className="absolute inset-4 z-50 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-zinc-700/80 bg-[#06070a]/95 backdrop-blur-2xl">
          <ProcessorDetailOverlay
            processorId={selectedProcessor}
            stats={moduleStats[selectedProcessor]}
            onBack={() => setSelectedProcessor(null)}
            onFault={() => faultProcessor(selectedProcessor)}
            onDegrade={() => degradeProcessor(selectedProcessor)}
            onRecover={() => recoverProcessor(selectedProcessor)}
            tick={tick}
          />
        </div>
      )}

      {/* Main Top Command Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/80 px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white uppercase">DPCC Tactical Command</h1>
              <span className="rounded-full bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-800/80 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                v3.0 HIL
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">System of Disseminated Parallel Controlled Computing Framework</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-[#020304] p-1 border border-zinc-800/80 shadow-inner">
            <button
              onClick={() => setActiveTab('SIMULATION')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'SIMULATION'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              }`}
            >
              <span>🎮 Tactical Command</span>
            </button>
            <button
              onClick={() => setActiveTab('IOT_HARDWARE')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'IOT_HARDWARE'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              }`}
            >
              <span>🔌 IoT Hardware (HIL)</span>
            </button>
          </div>

          <button
            onClick={() => setShowFirmwareModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] transition"
          >
            <span>⚡ C++ Sketches</span>
          </button>
        </div>

        {/* Right System Telemetry Indicators */}
        <div className="flex items-center gap-5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isRunning && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="font-bold tracking-wide text-zinc-100">{isRunning ? 'SYSTEM ONLINE' : 'STANDBY'}</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />
          <div className="text-zinc-400">Unit: <span className="text-emerald-400 font-bold">UAV-704 ALPHA</span></div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="text-zinc-400">Tick: <span className="text-zinc-100 font-bold">T+{tick}</span></div>
        </div>
      </header>

      {/* Main Content Workspace */}
      {activeTab === 'IOT_HARDWARE' ? (
        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/80">
          <IoTPanel onOpenFirmwareModal={() => setShowFirmwareModal(true)} />
        </main>
      ) : (
        <main className="relative z-10 grid min-h-0 flex-1 grid-cols-[320px_1fr_340px] gap-3 overflow-hidden">
          {/* Left Column: Mission Operations & Multi-Processor Hardware Matrix */}
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            {/* Mission Operations Panel */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">Mission Operations</h2>
                <span className="text-[10px] font-mono text-zinc-500">Event Dispatcher</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2.5">
                {!isRunning ? (
                  <button
                    onClick={startSimulation}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-extrabold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:from-emerald-500 hover:to-teal-500 transition"
                  >
                    <span>▶ Launch Mission Engine</span>
                  </button>
                ) : (
                  <button
                    onClick={stopSimulation}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-xs font-extrabold text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:from-amber-500 hover:to-orange-500 transition"
                  >
                    <span>⏸ Pause Execution</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  onClick={startMission}
                  className="rounded-lg border border-violet-500/40 bg-violet-950/40 py-1.5 text-violet-300 hover:bg-violet-900/60 hover:border-violet-400 transition"
                >
                  🚀 Transmit Route
                </button>
                <button
                  onClick={resetSimulation}
                  className="rounded-lg border border-rose-500/40 bg-rose-950/40 py-1.5 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition"
                >
                  🔄 Reset Core
                </button>
                <button
                  onClick={clearMission}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Clear Mission
                </button>
                <button
                  onClick={clearObstacles}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Clear Obstacles
                </button>
              </div>
            </div>

            {/* Parallel Multi-Processor Hardware Matrix */}
            <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">Parallel Processor Matrix</h2>
                  <p className="text-[10px] text-zinc-500 font-mono">Multi-node hardware redundancy</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  {activeModules.length} Active Nodes
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {PROCESSORS.map((procId) => {
                  const stats = moduleStats[procId];
                  const status = !stats || !stats.active ? 'OFFLINE' : stats.errorRate > 0.3 ? 'DEGRADED' : 'ONLINE';

                  return (
                    <div
                      key={procId}
                      className="rounded-xl border border-zinc-800/80 bg-[#07080c] p-3 transition hover:border-zinc-700/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setSelectedProcessor(procId)}
                          className="flex items-center gap-2 text-left group"
                        >
                          <span className="font-bold text-xs text-zinc-100 group-hover:text-emerald-400 transition">{procId} NODE</span>
                          <span className="text-[10px] text-zinc-500 font-mono group-hover:text-emerald-400 transition">ⓘ</span>
                        </button>

                        <span
                          className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md ${
                            status === 'ONLINE'
                              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : status === 'DEGRADED'
                              ? 'bg-amber-950/90 text-amber-400 border border-amber-800/80 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : 'bg-rose-950/90 text-rose-400 border border-rose-800/80 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          }`}
                        >
                          ● {status}
                        </span>
                      </div>

                      {/* Performance Metrics Bar */}
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-zinc-400 mb-2.5 bg-zinc-950 p-2 rounded-lg border border-zinc-800/60">
                        <div>
                          <span className="text-zinc-500 block text-[9px]">LATENCY</span>
                          <span className="font-bold text-zinc-200">{stats.latency.toFixed(0)} ms</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px]">THROUGHPUT</span>
                          <span className="font-bold text-zinc-200">{stats.throughput.toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px]">ERR RATE</span>
                          <span className={`font-bold ${stats.errorRate > 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                            {(stats.errorRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Inline Fault Control Buttons */}
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                        <button
                          onClick={() => degradeProcessor(procId)}
                          className="rounded-md py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition"
                        >
                          DEGRADE
                        </button>
                        <button
                          onClick={() => faultProcessor(procId)}
                          className="rounded-md py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition"
                        >
                          FAULT
                        </button>
                        <button
                          onClick={() => recoverProcessor(procId)}
                          className="rounded-md py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition"
                        >
                          RECOVER
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Center Column: Telemetry Header Strip + Radar Viewport */}
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            {/* Top Telemetry Metric Cards */}
            <div className="grid grid-cols-5 gap-2">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                  <span>🔋 Battery</span>
                  <span className="text-emerald-400 font-mono font-extrabold">{drone.energy.toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    style={{ width: `${Math.max(0, Math.min(100, drone.energy))}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">📍 GPS Pos</span>
                <span className="font-mono text-sm font-extrabold text-emerald-300 block mt-0.5">
                  [{drone.pos.x.toFixed(0)}, {drone.pos.y.toFixed(0)}]
                </span>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">🎯 Target Vector</span>
                <span className="font-mono text-sm font-extrabold text-violet-300 block mt-0.5">
                  [{target.x.toFixed(0)}, {target.y.toFixed(0)}]
                </span>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">🧭 Ground Speed</span>
                <span className="font-mono text-sm font-extrabold text-cyan-300 block mt-0.5">
                  {(speed * 12).toFixed(1)} km/h
                </span>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">🏁 Mission Progress</span>
                <span className="font-mono text-sm font-extrabold text-white block mt-0.5">
                  {waypointsDone} / {waypointsTotal} Done
                </span>
              </div>
            </div>

            {/* Tactical Radar Canvas Container */}
            <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="font-extrabold text-zinc-100 uppercase tracking-wider text-[11px]">Tactical Radar Environment</span>
                  <span className="text-[10px] font-mono text-zinc-500">| LIDAR SCAN: {sensorRange}m</span>
                </div>
                <div className="font-mono text-[10px] text-zinc-500">
                  L-Click: Obstacle | Shift+Click: Waypoint | R-Click: Target
                </div>
              </div>

              <div className="relative flex-1 min-h-0">
                <Canvas
                  stateRef={stateRef}
                  sensorRange={sensorRange}
                  onCanvasClick={handleCanvasClick}
                  tick={tick}
                />
              </div>
            </div>
          </section>

          {/* Right Column: Closed-Loop PID Actuation & Real-Time Telemetry Logs */}
          <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
            {/* Actuator & PID Monitor */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">Closed-Loop PID Actuation</h2>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800/80">
                  Kp: 0.45 | Ki: 0.02
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="bg-[#07080c] p-2.5 rounded-lg border border-zinc-800/80">
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Motor PWM Signal Output</span>
                    <span className="text-cyan-300 font-extrabold">{pwmOutput} / 255 PWM</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      style={{ width: `${(pwmOutput / 255) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#07080c] p-2 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 block">PID POS ERROR</span>
                    <span className="text-emerald-400 font-extrabold">{pidError}</span>
                  </div>
                  <div className="bg-[#07080c] p-2 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 block">TARGET DISTANCE</span>
                    <span className="text-violet-300 font-extrabold">{distToTarget.toFixed(1)} m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-Time Event Log Stream */}
            <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">Kernel Event Telemetry Stream</h2>
                <span className="text-[10px] font-mono text-zinc-500">{logs.length} events</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-lg border border-zinc-800/80 bg-[#040507] p-2.5 space-y-1.5 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-center text-xs text-zinc-600 py-10">Awaiting kernel telemetry events...</p>
                ) : (
                  logs.slice(0, 40).map((log) => (
                    <div key={log.id} className={`rounded-md p-2 border ${levelStyle[log.level] || 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider mb-1 opacity-80 font-bold">
                        <span>{log.service}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] leading-tight font-sans text-zinc-200">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
