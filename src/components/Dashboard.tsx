'use client';

import React, { useState } from 'react';
import { LogEntry, ModuleStats, TelemetryPoint, SimulationState } from '../types/simulation';

const MODULE_COLORS: Record<string, string> = {
    SENSOR: '#38bdf8', // sky-400
    NAV: '#818cf8', // indigo-400
    CONTROL: '#34d399', // emerald-400
    COMM: '#fbbf24', // amber-400
};

const STATUS_COLORS: Record<string, string> = {
    ONLINE: '#10b981', // emerald-500
    DEGRADED: '#f59e0b', // amber-500
    OFFLINE: '#ef4444', // red-500
    RECOVERING: '#0ea5e9', // sky-500
};

type ProcessorId = 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM';

interface DashboardProps {
    isRunning: boolean;
    speed: number;
    sensorRange: number;
    logs: LogEntry[];
    activeModules: string[];
    moduleStats: Record<string, ModuleStats>;
    stateRef: React.MutableRefObject<SimulationState>;
    telemetry: Record<string, TelemetryPoint[]>;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
    onRangeChange: (range: number) => void;
    onMissionStart: () => void;
    onFaultProcessor: (id: ProcessorId) => void;
    onDegradeProcessor: (id: ProcessorId) => void;
    onRecoverProcessor: (id: ProcessorId) => void;
    tick: number;
    onSelectProcessor: (id: ProcessorId) => void;
}

type TabKey = 'TELEMETRY' | 'PROCESSORS' | 'MISSION';

const Dashboard: React.FC<DashboardProps> = ({
    isRunning, speed, sensorRange, logs, activeModules, moduleStats, stateRef,
    telemetry, onStart, onStop, onReset, onSpeedChange, onRangeChange, onMissionStart,
    onFaultProcessor, onDegradeProcessor, onRecoverProcessor, tick, onSelectProcessor
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('TELEMETRY');
    const state = stateRef.current;
    const drone = state.drone;

    const getProcessorStatus = (name: string): string => {
        const stats = moduleStats[name];
        if (!stats) return 'UNKNOWN';
        if (!stats.active) return 'OFFLINE';
        if (stats.errorRate > 0.3) return 'DEGRADED';
        return 'ONLINE';
    };

    return (
        <aside className="w-96 flex flex-col gap-4 text-slate-200 relative">

            {/* Quick Actions & System Header */}
            <div className="bg-slate-800 p-4 rounded-xl shadow-md border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold tracking-tight uppercase text-white">Control Panel</h2>
                    <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 rounded font-mono">TICK: {tick}</span>
                </div>
                
                <div className="flex gap-2">
                    {!isRunning ? (
                        <button
                            id="btn-start"
                            onClick={onStart}
                            className="flex-1 bg-emerald-600 text-white font-semibold text-xs py-2.5 rounded-lg hover:bg-emerald-500 transition-colors shadow"
                        >
                            Start Simulation
                        </button>
                    ) : (
                        <button
                            id="btn-stop"
                            onClick={onStop}
                            className="flex-1 bg-rose-600 text-white font-semibold text-xs py-2.5 rounded-lg hover:bg-rose-500 transition-colors shadow"
                        >
                            Stop Simulation
                        </button>
                    )}
                    <button
                        id="btn-reset"
                        onClick={onReset}
                        className="px-4 bg-slate-700 text-white border border-slate-600 hover:bg-slate-600 font-semibold text-xs rounded-lg transition-colors shadow"
                        title="Reset Environment"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Data Tabs Panel */}
            <div className="flex-1 bg-slate-800 rounded-xl flex flex-col shadow-md border border-slate-700 overflow-hidden min-h-0 relative">
                
                <div className="flex border-b border-slate-700 p-1 bg-slate-900/50">
                    {(['TELEMETRY', 'PROCESSORS', 'MISSION'] as TabKey[]).map((tab) => (
                        <button
                            key={tab}
                            id={`tab-${tab.toLowerCase()}`}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${
                                activeTab === tab
                                    ? 'bg-slate-800 text-blue-400 shadow-sm border border-slate-600'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                    {/* ── TELEMETRY TAB ── */}
                    {activeTab === 'TELEMETRY' && (
                        <div className="space-y-6">
                            {/* Key Indicators */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="border border-slate-600 rounded-lg p-3 bg-slate-700/30">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Energy Level</div>
                                    <div className={`text-lg font-bold font-mono ${drone.energy < 20 ? 'text-rose-400' : 'text-white'}`}>
                                        {drone.energy.toFixed(1)}%
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                                        <div
                                            className="h-full transition-all duration-500"
                                            style={{
                                                width: `${drone.energy}%`,
                                                background: drone.energy > 50 ? '#10b981' : drone.energy > 25 ? '#f59e0b' : '#ef4444',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="border border-slate-600 rounded-lg p-3 bg-slate-700/30">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Position</div>
                                    <div className="text-sm font-mono text-white mt-1">
                                        [{drone.pos.x.toFixed(0)}, {drone.pos.y.toFixed(0)}]
                                    </div>
                                    <div className="text-xs font-mono text-slate-400 mt-1">
                                        Head: {drone.heading.toFixed(0)}°
                                    </div>
                                </div>
                            </div>

                            {/* Energy Chart */}
                            <div>
                                <div className="text-xs font-bold text-slate-300 mb-2">Energy Depletion Trend</div>
                                <div className="h-20 w-full bg-slate-900 rounded-lg flex items-end gap-0.5 p-2 border border-slate-700 shadow-inner">
                                    {(telemetry['UAV-704'] ?? []).slice(-40).map((pt, i) => (
                                        <div
                                            key={i}
                                            className="w-full rounded-t-sm"
                                            style={{
                                                height: `${pt.value}%`,
                                                background: pt.value > 50 ? '#10b981' : pt.value > 25 ? '#f59e0b' : '#ef4444',
                                                opacity: 0.6 + (i / 40) * 0.4,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Network Health */}
                            <div>
                                <div className="text-xs font-bold text-slate-300 mb-2">Processor Latency Profile</div>
                                <div className="space-y-1.5">
                                    {Object.entries(moduleStats).map(([name, stats]) => {
                                        const status = getProcessorStatus(name);
                                        return (
                                            <div key={name} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-700 bg-slate-800/80 shadow-sm cursor-pointer hover:border-slate-500 transition-colors" onClick={() => onSelectProcessor(name as ProcessorId)}>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: STATUS_COLORS[status] ?? '#94a3b8' }}
                                                    />
                                                    <span className="text-xs font-semibold text-slate-200">{name}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                                                        status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        status === 'DEGRADED' ? 'bg-amber-500/20 text-amber-400' :
                                                        status === 'RECOVERING' ? 'bg-sky-500/20 text-sky-400' :
                                                        'bg-rose-500/20 text-rose-400'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                    <span className="text-xs font-mono font-medium text-slate-400 w-12 text-right">
                                                        {stats.latency.toFixed(0)}ms
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PROCESSORS TAB ── */}
                    {activeTab === 'PROCESSORS' && (
                        <div className="space-y-4">
                            <div className="bg-sky-900/30 border border-sky-800 text-sky-200 text-[11px] p-3 rounded-lg leading-relaxed">
                                <strong className="block mb-1">Architecture Diagnostics</strong>
                                Select a processor below for deep telemetry, or use quick actions to inject hardware faults.
                            </div>
                            
                            {(['SENSOR', 'NAV', 'CONTROL', 'COMM'] as ProcessorId[]).map((proc) => {
                                const stats = moduleStats[proc];
                                const status = getProcessorStatus(proc);
                                const isOnline = status === 'ONLINE';
                                
                                return (
                                    <div
                                        key={proc}
                                        className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                                            isOnline ? 'border-slate-600 bg-slate-700/30 shadow hover:border-slate-500 hover:bg-slate-700/50' 
                                            : status === 'DEGRADED' ? 'border-amber-600/50 bg-amber-900/20 hover:border-amber-500'
                                            : status === 'RECOVERING' ? 'border-sky-600/50 bg-sky-900/20 hover:border-sky-500'
                                            : 'border-rose-600/50 bg-rose-900/20 hover:border-rose-500'
                                        }`}
                                        onClick={() => onSelectProcessor(proc)}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${isOnline ? 'bg-slate-800' : 'bg-black/20'}`}>
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-100">{proc} Processor</span>
                                            </div>
                                            <div className="text-slate-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                            </div>
                                        </div>

                                        {stats && (
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="bg-slate-900/50 border border-slate-700 rounded p-1.5 text-center">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Latency</div>
                                                    <div className="text-xs font-mono font-semibold text-slate-200">{stats.latency.toFixed(0)} ms</div>
                                                </div>
                                                <div className="bg-slate-900/50 border border-slate-700 rounded p-1.5 text-center">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Error Rate</div>
                                                    <div className={`text-xs font-mono font-semibold ${stats.errorRate > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                                                        {(stats.errorRate * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900/50 border border-slate-700 rounded p-1.5 text-center">
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">Usage</div>
                                                    <div className="text-xs font-mono font-semibold text-slate-200">{stats.throughput.toFixed(0)}%</div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDegradeProcessor(proc); }}
                                                className="flex-1 py-1.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                                            >
                                                DEGRADE
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onFaultProcessor(proc); }}
                                                className="flex-1 py-1.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
                                            >
                                                KILL
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRecoverProcessor(proc); }}
                                                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${
                                                    isOnline 
                                                    ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' 
                                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                                }`}
                                                disabled={isOnline}
                                            >
                                                RECOVER
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── MISSION TAB ── */}
                    {activeTab === 'MISSION' && (
                        <div className="space-y-4">
                            <button
                                onClick={onMissionStart}
                                className="w-full bg-blue-600 text-white font-semibold text-xs py-2.5 rounded-lg hover:bg-blue-500 transition-colors shadow"
                            >
                                Transmit Mission Data
                            </button>
                            
                            <hr className="border-slate-700" />
                            
                            {state.missions.map(mission => (
                                <div key={mission.id} className="p-3.5 rounded-xl border border-slate-700 bg-slate-700/20 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                        <span className="text-sm font-bold text-slate-200">Mission ID: {mission.id}</span>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                            mission.status === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}>
                                            {mission.status}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Waypoints</div>
                                        <div className="flex flex-col gap-1.5">
                                            {mission.waypoints.map((wp, i) => (
                                                <div key={i} className="flex justify-between items-center bg-slate-800 p-1.5 rounded border border-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                                            wp.reached ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                                                        }`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[11px] font-mono text-slate-300">[{wp.pos.x}, {wp.pos.y}]</span>
                                                    </div>
                                                    {wp.reached && <span className="text-[10px] font-bold text-emerald-400">REACHED</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Dashboard;
