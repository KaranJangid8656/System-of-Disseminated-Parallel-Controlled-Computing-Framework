'use client';

import React from 'react';
import { useSimulationEngine } from '../hooks/useSimulationEngine';
import Canvas from '../components/Canvas';
import Dashboard from '../components/Dashboard';
import LogPanel from '../components/LogPanel';

import ProcessorDetailOverlay from '../components/ProcessorDetailOverlay';

export default function Home() {
  const {
    stateRef,
    isRunning,
    speed,
    setSpeed,
    sensorRange,
    setSensorRange,
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

  const [selectedProcessor, setSelectedProcessor] = React.useState<'SENSOR' | 'NAV' | 'CONTROL' | 'COMM' | null>(null);

  const handleCanvasClick = (pos: { x: number, y: number }, rightClick?: boolean, shiftClick?: boolean) => {
    if (rightClick) {
      setTarget(pos);
    } else if (shiftClick) {
      addWaypoint(pos);
    } else {
      addObstacle(pos);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-slate-950 p-4 gap-4 text-slate-200 font-sans relative">
      
      {/* FULL PAGE PROCESSOR OVERLAY */}
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

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-slate-800 rounded-xl shadow border border-slate-700">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white">
            DPCC <span className="font-normal text-slate-400">Distributed Multi-Processor Framework</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-white">{isRunning ? 'System Active' : 'System Standby'}</span>
          </div>
          <div className="h-4 w-px bg-slate-600" />
          <div>Unit: <span className="font-mono text-white">UAV-704</span></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Simulation Canvas & Logs */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 relative overflow-hidden bg-slate-900 rounded-xl shadow border border-slate-700 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Environment Viewport</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-500 normal-case font-normal">
                  Left-click: Add Obstacle | Shift-click: Add WP | Right-click: Target
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearMission}
                    className="px-3 py-1 text-[10px] font-bold rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 tracking-widest transition-colors"
                  >
                    CLEAR MISSION
                  </button>
                  <button
                    onClick={clearObstacles}
                    className="px-3 py-1 text-[10px] font-bold rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 tracking-widest transition-colors"
                  >
                    CLEAR ALL OBSTACLES
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-[1] min-h-0 min-w-0 flex items-stretch">
                <Canvas 
                  stateRef={stateRef} 
                  sensorRange={sensorRange} 
                  onCanvasClick={(pos, right, shift) => handleCanvasClick(pos, right, shift)}
                  tick={tick}
                />
            </div>
          </div>

          <LogPanel logs={logs} onClear={() => {}} />
        </section>

        {/* Control Dashboard */}
        <Dashboard 
          isRunning={isRunning}
          speed={speed}
          sensorRange={sensorRange}
          logs={logs}
          activeModules={activeModules}
          moduleStats={moduleStats}
          stateRef={stateRef}
          telemetry={telemetry}
          onStart={startSimulation}
          onStop={stopSimulation}
          onReset={resetSimulation}
          onSpeedChange={setSpeed}
          onRangeChange={setSensorRange}
          onMissionStart={startMission}
          onFaultProcessor={faultProcessor}
          onDegradeProcessor={degradeProcessor}
          onRecoverProcessor={recoverProcessor}
          tick={tick}
          onSelectProcessor={(proc) => setSelectedProcessor(proc)}
        />
      </main>
    </div>
  );
}
