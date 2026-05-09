'use client';

import React from 'react';
import { useSimulationEngine } from '../hooks/useSimulationEngine';
import Canvas from '../components/Canvas';
import ProcessorDetailOverlay from '../components/ProcessorDetailOverlay';
import LandingPage from '../components/LandingPage';

type ProcessorId = 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM';

const PROCESSORS: ProcessorId[] = ['SENSOR', 'NAV', 'CONTROL', 'COMM'];

const levelStyle: Record<string, string> = {
  INFO: 'text-slate-300',
  WARNING: 'text-amber-300',
  ERROR: 'text-rose-300',
  SUCCESS: 'text-emerald-300',
  CRITICAL: 'text-fuchsia-300',
};

export default function Home() {
  const [showLanding, setShowLanding] = React.useState(true);
  const [systemVisible, setSystemVisible] = React.useState(false);

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

  const [selectedProcessor, setSelectedProcessor] = React.useState<ProcessorId | null>(null);

  const handleCanvasClick = (pos: { x: number, y: number }, rightClick?: boolean, shiftClick?: boolean) => {
    if (rightClick) {
      setTarget(pos);
    } else if (shiftClick) {
      addWaypoint(pos);
    } else {
      addObstacle(pos);
    }
  };

  const handleEnterSystem = () => {
    setShowLanding(false);
    setSystemVisible(true);
  };

  const drone = stateRef.current.drone;
  const mission = stateRef.current.missions.find((m) => m.status === 'active');
  const waypointsTotal = mission?.waypoints.length ?? 0;
  const waypointsDone = mission?.waypoints.filter((wp) => wp.reached).length ?? 0;
  const telemetryWindow = telemetry['UAV-704'] ?? [];
  const latestTelemetry = telemetryWindow[telemetryWindow.length - 1];
  const target = stateRef.current.target;

  return (
    <>
      {showLanding && (
        <LandingPage onEnterSystem={handleEnterSystem} />
      )}

      {systemVisible && (
        <div className="relative flex h-screen max-h-screen flex-col gap-4 overflow-hidden bg-[#030915] p-4 text-slate-100 system-enter">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.14),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.13),transparent_42%)]" />

          {selectedProcessor && (
            <div className="absolute inset-4 z-50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-600">
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

          <header className="relative z-10 flex items-center justify-between rounded-2xl border border-[#1b2a48] bg-[#071325]/95 px-6 py-4 shadow-[0_15px_50px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-400/80">DPCC command interface</p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Autonomous Mission Control
              </h1>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {isRunning && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="font-medium text-white">{isRunning ? 'Mission Active' : 'Standby'}</span>
              </div>
              <div className="h-4 w-px bg-[#1b2a48]" />
              <div>Unit: <span className="font-mono text-cyan-300">UAV-704</span></div>
              <div className="h-4 w-px bg-[#1b2a48]" />
              <div>Tick: <span className="font-mono text-white">{tick}</span></div>
            </div>
          </header>

          <main className="relative z-10 grid min-h-0 flex-1 grid-cols-[1.4fr_0.95fr] gap-4 overflow-hidden">
            <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#1b2a48] bg-[#08152b]/90 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Energy</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-white">{drone.energy.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-[#1b2a48] bg-[#08152b]/90 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Position</p>
                  <p className="mt-2 font-mono text-lg text-cyan-300">[{drone.pos.x.toFixed(0)}, {drone.pos.y.toFixed(0)}]</p>
                </div>
                <div className="rounded-xl border border-[#1b2a48] bg-[#08152b]/90 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mission Progress</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-white">{waypointsDone}/{waypointsTotal}</p>
                </div>
                <div className="rounded-xl border border-[#1b2a48] bg-[#08152b]/90 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Target Vector</p>
                  <p className="mt-2 font-mono text-lg text-violet-300">[{target.x.toFixed(0)}, {target.y.toFixed(0)}]</p>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#1b2a48] bg-[#08152b]/92 shadow-[0_10px_40px_rgba(2,8,30,0.7)]">
                <div className="flex items-center justify-between border-b border-[#1b2a48] bg-[#060f22] px-4 py-2 text-xs">
                  <p className="uppercase tracking-[0.25em] text-slate-400">Tactical environment</p>
                  <p className="font-mono text-slate-500">L-Click: obstacle | Shift+Click: waypoint | R-Click: target</p>
                </div>
                <div className="min-h-0 flex-1">
                  <Canvas
                    stateRef={stateRef}
                    sensorRange={sensorRange}
                    onCanvasClick={(pos, right, shift) => handleCanvasClick(pos, right, shift)}
                    tick={tick}
                  />
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col gap-4 overflow-hidden">
              <div className="rounded-2xl border border-[#1b2a48] bg-[#071428]/95 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.26em] text-slate-400">Mission Controls</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={startSimulation} className="rounded-lg bg-emerald-600/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">Start</button>
                  <button onClick={stopSimulation} className="rounded-lg bg-amber-500/80 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-400">Pause</button>
                  <button onClick={startMission} className="rounded-lg bg-cyan-600/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">Launch Mission</button>
                  <button onClick={resetSimulation} className="rounded-lg bg-rose-600/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">Hard Reset</button>
                  <button onClick={clearMission} className="rounded-lg border border-[#24406a] bg-[#0a1d3c] px-3 py-2 text-sm text-slate-200 transition hover:bg-[#10284f]">Clear Mission</button>
                  <button onClick={clearObstacles} className="rounded-lg border border-[#24406a] bg-[#0a1d3c] px-3 py-2 text-sm text-slate-200 transition hover:bg-[#10284f]">Clear Obstacles</button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Speed and sensor range are fixed by the current engine profile.</p>
              </div>

              <div className="rounded-2xl border border-[#1b2a48] bg-[#071428]/95 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Processor Matrix</p>
                  <span className="text-xs text-slate-500">{activeModules.length} active slots</span>
                </div>
                <div className="space-y-2">
                  {PROCESSORS.map((processor) => {
                    const stats = moduleStats[processor];
                    return (
                      <button
                        key={processor}
                        className="w-full rounded-lg border border-[#24385f] bg-[#081b35] p-3 text-left transition hover:border-cyan-500/60 hover:bg-[#10254a]"
                        onClick={() => setSelectedProcessor(processor)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100">{processor}</span>
                          <span className={`text-xs ${stats.active ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {stats.active ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-xs text-slate-300">
                          <span>{stats.latency.toFixed(0)}ms</span>
                          <span>{stats.throughput.toFixed(0)}%</span>
                          <span>{(stats.errorRate * 100).toFixed(2)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#1b2a48] bg-[#071428]/95 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Telemetry Stream</p>
                  <span className="font-mono text-xs text-slate-500">
                    {latestTelemetry ? latestTelemetry.value.toFixed(1) : '--'}%
                  </span>
                </div>
                <div className="mb-3 h-2 rounded-full bg-[#0d2448]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                    style={{ width: `${Math.max(0, Math.min(100, drone.energy))}%` }}
                  />
                </div>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#1d3152] bg-[#061327] p-3">
                  {logs.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">Awaiting mission events...</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 40).map((log) => (
                        <div key={log.id} className="rounded border border-[#1b2f4f] bg-[#071833] p-2">
                          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider">
                            <span className={levelStyle[log.level] ?? 'text-slate-300'}>{log.level}</span>
                            <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-slate-300">{log.service}: {log.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </main>
        </div>
      )}
    </>
  );
}
