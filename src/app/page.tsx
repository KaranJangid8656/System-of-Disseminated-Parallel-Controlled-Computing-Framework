'use client';

import React from 'react';
import { useSimulationEngine } from '../hooks/useSimulationEngine';
import Canvas from '../components/Canvas';
import Dashboard from '../components/Dashboard';
import LogPanel from '../components/LogPanel';

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
    startMission,
    faultProcessor,
    degradeProcessor,
    recoverProcessor,
  } = useSimulationEngine();

  const handleCanvasClick = (pos: { x: number, y: number }, rightClick?: boolean) => {
    if (rightClick) {
      setTarget(pos);
    } else {
      addObstacle(pos);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#050b14] p-4 gap-4">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-extrabold tracking-tighter">
            <span className="text-[#00f2ff]">DPCC</span> <span className="opacity-50">COMMAND CENTER</span>
          </h1>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00ffaa] animate-pulse shadow-[0_0_10px_#00ffaa]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
              {isRunning ? 'System Active' : 'System Standby'}
            </span>
          </div>
        </div>
        
        <div className="flex gap-6 text-[10px] uppercase font-bold tracking-widest opacity-40">
          <div>Architecture: Distributed Parallel</div>
          <div>Unit: UAV-704</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 gap-4 overflow-hidden">
        {/* Simulation Viewport */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 glass rounded-2xl relative overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
              <span className="text-[8px] font-bold tracking-[0.3em] uppercase opacity-50">LiDAR Feed</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#00f2ff]">TL-704</span>
                <span className="text-xs font-mono opacity-30">|</span>
                <span className="text-xs font-mono">ENCRYPTED_LINK</span>
              </div>
            </div>

            <div className="absolute top-4 right-4 z-10 pointer-events-none text-right flex flex-col gap-1">
              <span className="text-[14px] font-mono text-[#00f2ff]">X:{Math.round(stateRef.current.drone.pos.x)} Y:{Math.round(stateRef.current.drone.pos.y)}</span>
              <span className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">ALT: {Math.round(stateRef.current.drone.altitude)}m</span>
            </div>

            <div className="scanline" />
            <div className="radar-sweep" />
            
            <Canvas 
              stateRef={stateRef} 
              sensorRange={sensorRange} 
              onCanvasClick={handleCanvasClick}
              tick={tick}
            />
          </div>

          <LogPanel logs={logs} onClear={() => {}} />
        </section>

        {/* Control Sidepanel */}
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
        />
      </main>

      {/* Footer Info */}
      <footer className="text-[8px] uppercase tracking-[0.5em] opacity-20 text-center py-2">
        System of Disseminated Parallel Controlled Computing &copy; 2024 - Project V2.0
      </footer>
    </div>
  );
}

