'use client';

import React from 'react';
import { useSimulationEngine } from '../hooks/useSimulationEngine';
import Canvas from '../components/Canvas';
import ProcessorDetailOverlay from '../components/ProcessorDetailOverlay';
import LandingPage from '../components/LandingPage';

type ProcessorId = 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM';

const PROCESSORS: ProcessorId[] = ['SENSOR', 'NAV', 'CONTROL', 'COMM'];

const CENTER_PARAM = 'center';
const PROCESSOR_PARAM = 'p';

function parseShellFromSearch(search: string): { control: boolean; processor: ProcessorId | null } {
  const q = new URLSearchParams(search);
  const control = q.get(CENTER_PARAM) === '1';
  const raw = q.get(PROCESSOR_PARAM);
  const processor =
    raw && (PROCESSORS as readonly string[]).includes(raw) ? (raw as ProcessorId) : null;
  return { control, processor };
}

const levelStyle: Record<string, string> = {
  INFO: 'text-zinc-300',
  WARNING: 'text-amber-300',
  ERROR: 'text-rose-300',
  SUCCESS: 'text-emerald-300',
  CRITICAL: 'text-orange-300',
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

  const applyShellFromUrl = React.useCallback(() => {
    const { control, processor } = parseShellFromSearch(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    setShowLanding(!control);
    setSystemVisible(control);
    setSelectedProcessor(processor);
  }, []);

  React.useLayoutEffect(() => {
    applyShellFromUrl();
  }, [applyShellFromUrl]);

  React.useEffect(() => {
    window.addEventListener('popstate', applyShellFromUrl);
    return () => window.removeEventListener('popstate', applyShellFromUrl);
  }, [applyShellFromUrl]);

  const pushShellUrl = (next: { control: boolean; processor: ProcessorId | null }) => {
    const u = new URL(window.location.href);
    u.searchParams.delete(CENTER_PARAM);
    u.searchParams.delete(PROCESSOR_PARAM);
    if (next.control) {
      u.searchParams.set(CENTER_PARAM, '1');
      if (next.processor) u.searchParams.set(PROCESSOR_PARAM, next.processor);
    }
    const qs = u.searchParams.toString();
    window.history.pushState(null, '', `${u.pathname}${qs ? `?${qs}` : ''}`);
  };

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
    pushShellUrl({ control: true, processor: null });
    setShowLanding(false);
    setSystemVisible(true);
    setSelectedProcessor(null);
  };

  const openProcessorDetail = (processor: ProcessorId) => {
    pushShellUrl({ control: true, processor });
    setSelectedProcessor(processor);
  };

  const closeProcessorDetail = () => {
    window.history.back();
  };

  /** One-click return to the 3D intro (does not rely on how many history steps were pushed). */
  const goToIntro = () => {
    const base = window.location.pathname || '/';
    window.history.replaceState(null, '', base);
    setShowLanding(true);
    setSystemVisible(false);
    setSelectedProcessor(null);
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
        <div className="relative flex h-screen max-h-screen flex-col gap-4 overflow-hidden bg-zinc-950 p-4 text-zinc-100 system-enter">
          <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.06),transparent_45%),radial-gradient(circle_at_100%_60%,rgba(99,102,241,0.05),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(39,39,42,0.9),transparent_50%)]" />

          {selectedProcessor && (
            <div className="absolute inset-4 z-50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)] border border-zinc-700">
              <ProcessorDetailOverlay
                processorId={selectedProcessor}
                stats={moduleStats[selectedProcessor]}
                onBack={closeProcessorDetail}
                onFault={() => faultProcessor(selectedProcessor)}
                onDegrade={() => degradeProcessor(selectedProcessor)}
                onRecover={() => recoverProcessor(selectedProcessor)}
                tick={tick}
              />
            </div>
          )}

          <header className="relative z-10 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/90 px-6 py-4 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goToIntro}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-300 transition hover:border-emerald-600/40 hover:bg-zinc-800 hover:text-zinc-50"
                >
                  ← Intro
                </button>
                <p className="text-[11px] uppercase tracking-[0.32em] text-emerald-400/90">DPCC command interface</p>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                Autonomous Mission Control
              </h1>
            </div>

            <div className="flex items-center gap-6 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {isRunning && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="font-medium text-zinc-100">{isRunning ? 'Mission Active' : 'Standby'}</span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div>Unit: <span className="font-mono text-emerald-300/90">UAV-704</span></div>
              <div className="h-4 w-px bg-zinc-800" />
              <div>Tick: <span className="font-mono text-zinc-100">{tick}</span></div>
            </div>
          </header>

          <main className="relative z-10 grid min-h-0 flex-1 grid-cols-[1.4fr_0.95fr] gap-4 overflow-hidden">
            <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Energy</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50">{drone.energy.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Position</p>
                  <p className="mt-2 font-mono text-lg text-emerald-300">[{drone.pos.x.toFixed(0)}, {drone.pos.y.toFixed(0)}]</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Mission Progress</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50">{waypointsDone}/{waypointsTotal}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Target Vector</p>
                  <p className="mt-2 font-mono text-lg text-violet-300">[{target.x.toFixed(0)}, {target.y.toFixed(0)}]</p>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-xs">
                  <p className="uppercase tracking-[0.25em] text-zinc-500">Tactical environment</p>
                  <p className="font-mono text-zinc-600">L-Click: obstacle | Shift+Click: waypoint | R-Click: target</p>
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
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.26em] text-zinc-500">Mission Controls</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={startSimulation} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600">Start</button>
                  <button onClick={stopSimulation} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-500">Pause</button>
                  <button onClick={startMission} className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-600">Launch Mission</button>
                  <button onClick={resetSimulation} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600">Hard Reset</button>
                  <button onClick={clearMission} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800">Clear Mission</button>
                  <button onClick={clearObstacles} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800">Clear Obstacles</button>
                </div>
                <p className="mt-3 text-xs text-zinc-600">Speed and sensor range are fixed by the current engine profile.</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.26em] text-zinc-500">Processor Matrix</p>
                  <span className="text-xs text-zinc-600">{activeModules.length} active slots</span>
                </div>
                <div className="space-y-2">
                  {PROCESSORS.map((processor) => {
                    const stats = moduleStats[processor];
                    return (
                      <button
                        key={processor}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-emerald-600/35 hover:bg-zinc-900"
                        onClick={() => openProcessorDetail(processor)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-100">{processor}</span>
                          <span className={`text-xs ${stats.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stats.active ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-xs text-zinc-400">
                          <span>{stats.latency.toFixed(0)}ms</span>
                          <span>{stats.throughput.toFixed(0)}%</span>
                          <span>{(stats.errorRate * 100).toFixed(2)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.26em] text-zinc-500">Telemetry Stream</p>
                  <span className="font-mono text-xs text-zinc-600">
                    {latestTelemetry ? latestTelemetry.value.toFixed(1) : '--'}%
                  </span>
                </div>
                <div className="mb-3 h-2 rounded-full bg-zinc-950">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                    style={{ width: `${Math.max(0, Math.min(100, drone.energy))}%` }}
                  />
                </div>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  {logs.length === 0 ? (
                    <p className="text-center text-sm text-zinc-600">Awaiting mission events...</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 40).map((log) => (
                        <div key={log.id} className="rounded border border-zinc-800 bg-zinc-900 p-2">
                          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider">
                            <span className={levelStyle[log.level] ?? 'text-zinc-300'}>{log.level}</span>
                            <span className="text-zinc-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-zinc-400">{log.service}: {log.message}</p>
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
