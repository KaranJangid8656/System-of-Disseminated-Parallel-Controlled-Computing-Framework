'use client';

import React, { useState } from 'react';
import { LogEntry, ModuleStats, TelemetryPoint, SimulationState } from '../types/simulation';

const MODULE_COLORS: Record<string, string> = {
    SENSOR: '#00f2ff', NAV: '#7000ff', CONTROL: '#00ffaa', COMM: '#ffcc00',
};

const STATUS_COLORS: Record<string, string> = {
    ONLINE: '#00ffaa', DEGRADED: '#ffcc00', OFFLINE: '#ff0055', RECOVERING: '#ff8800',
};

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
    onFaultProcessor: (id: 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM') => void;
    onDegradeProcessor: (id: 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM') => void;
    onRecoverProcessor: (id: 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM') => void;
    tick: number;
}

type TabKey = 'TELEMETRY' | 'PROCESSORS' | 'MISSION';

const Dashboard: React.FC<DashboardProps> = ({
    isRunning, speed, sensorRange, logs, activeModules, moduleStats, stateRef,
    telemetry, onStart, onStop, onReset, onSpeedChange, onRangeChange, onMissionStart,
    onFaultProcessor, onDegradeProcessor, onRecoverProcessor, tick
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
        <aside className="w-80 h-full flex flex-col gap-4">
            {/* System Status Panel */}
            <div className="glass p-4 rounded-2xl border-t border-white/10 relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-[0.3em] opacity-40 uppercase">Multi-Proc System</span>
                        <span className="text-xl font-black text-[#00f2ff] tracking-tighter italic">
                            {isRunning ? 'ACTIVE' : 'STANDBY'}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[8px] opacity-40 uppercase font-bold">UAV</span>
                        <span className="text-xs font-mono font-bold tracking-widest">{drone.id}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1 bg-white/[0.03] rounded-lg p-2">
                        <span className="text-[7px] opacity-40 uppercase font-bold">BATT</span>
                        <span className={`text-sm font-mono font-bold ${drone.energy < 20 ? 'text-[#ff0055]' : 'text-[#00ffaa]'}`}>
                            {drone.energy.toFixed(1)}%
                        </span>
                        <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${drone.energy}%`,
                                    background: drone.energy > 50 ? '#00ffaa' : drone.energy > 25 ? '#ffcc00' : '#ff0055',
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 bg-white/[0.03] rounded-lg p-2">
                        <span className="text-[7px] opacity-40 uppercase font-bold">POS</span>
                        <span className="text-[10px] font-mono opacity-70">
                            {drone.pos.x.toFixed(0)}, {drone.pos.y.toFixed(0)}
                        </span>
                        <span className="text-[8px] font-mono opacity-30">
                            HEAD {drone.heading.toFixed(0)}°
                        </span>
                    </div>
                </div>

                {/* Tick counter */}
                <div className="mt-2 text-[7px] font-mono opacity-20 text-right">TICK #{tick}</div>
            </div>

            {/* Tactical Controls */}
            <div className="glass p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex gap-2">
                    {!isRunning ? (
                        <button
                            id="btn-start"
                            onClick={onStart}
                            className="flex-1 bg-[#00f2ff] text-black font-black text-[11px] py-3 rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                        >
                            ▶ INITIATE ENGINE
                        </button>
                    ) : (
                        <button
                            id="btn-stop"
                            onClick={onStop}
                            className="flex-1 bg-[#ff0055] text-white font-black text-[11px] py-3 rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,85,0.3)] animate-pulse"
                        >
                            ■ TERMINATE LINK
                        </button>
                    )}
                    <button
                        id="btn-reset"
                        onClick={onReset}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
                    >
                        🔄
                    </button>
                </div>
                <button
                    id="btn-mission"
                    onClick={onMissionStart}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl py-2 text-[9px] font-bold uppercase tracking-widest"
                >
                    ◈ Start Mission
                </button>
            </div>

            {/* Main Tabs Container */}
            <div className="flex-1 glass rounded-2xl p-4 flex flex-col overflow-hidden min-h-0">
                <div className="flex gap-1 mb-4">
                    {(['TELEMETRY', 'PROCESSORS', 'MISSION'] as TabKey[]).map((tab) => (
                        <button
                            key={tab}
                            id={`tab-${tab.toLowerCase()}`}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 rounded-lg text-[8px] font-black tracking-widest transition-all ${activeTab === tab
                                ? 'bg-white/10 text-[#00f2ff]'
                                : 'opacity-30 hover:opacity-70'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">

                    {/* ── TELEMETRY TAB ── */}
                    {activeTab === 'TELEMETRY' && (
                        <div className="space-y-4">
                            {/* Energy sparkline */}
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-bold tracking-[0.2em] opacity-30 uppercase">Energy History</span>
                                <div className="h-16 w-full bg-black/40 rounded flex items-end gap-[2px] p-2 border border-white/5">
                                    {(telemetry['UAV-704'] ?? []).slice(-40).map((pt, i) => (
                                        <div
                                            key={i}
                                            className="w-full"
                                            style={{
                                                height: `${pt.value}%`,
                                                background: pt.value > 50 ? '#00ffaa' : pt.value > 25 ? '#ffcc00' : '#ff0055',
                                                opacity: 0.5 + (i / 40) * 0.5,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Processor latency readouts */}
                            <div className="grid grid-cols-1 gap-2">
                                <span className="text-[9px] font-bold tracking-[0.2em] opacity-30 uppercase">Processor Latencies</span>
                                {Object.entries(moduleStats).map(([name, stats]) => {
                                    const status = getProcessorStatus(name);
                                    return (
                                        <div key={name} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: STATUS_COLORS[status] ?? '#888', boxShadow: `0 0 6px ${STATUS_COLORS[status] ?? '#888'}88` }}
                                                />
                                                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: MODULE_COLORS[name] }} />
                                                <span className="text-[10px] font-bold">{name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[8px] opacity-30">{status}</span>
                                                <span className="text-[9px] font-mono opacity-60">{stats.latency.toFixed(0)}ms</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── PROCESSORS TAB ── */}
                    {activeTab === 'PROCESSORS' && (
                        <div className="space-y-3">
                            <p className="text-[8px] opacity-30 tracking-wide">Click to inject faults or recover processors in real-time.</p>
                            {(['SENSOR', 'NAV', 'CONTROL', 'COMM'] as const).map((proc) => {
                                const stats = moduleStats[proc];
                                const status = getProcessorStatus(proc);
                                const color = MODULE_COLORS[proc];
                                const statusColor = STATUS_COLORS[status] ?? '#888';
                                return (
                                    <div
                                        key={proc}
                                        className="rounded-xl p-3 border bg-white/[0.02] flex flex-col gap-2"
                                        style={{ borderColor: `${color}30` }}
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}88` }}
                                                />
                                                <span className="text-[11px] font-black" style={{ color }}>{proc}</span>
                                            </div>
                                            <span
                                                className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm"
                                                style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
                                            >
                                                {status}
                                            </span>
                                        </div>

                                        {/* Stats bar */}
                                        {stats && (
                                            <div className="grid grid-cols-3 gap-1 text-[7px] font-mono opacity-50">
                                                <div>LAT: {stats.latency.toFixed(0)}ms</div>
                                                <div>ERR: {(stats.errorRate * 100).toFixed(0)}%</div>
                                                <div>THR: {stats.throughput.toFixed(0)}%</div>
                                            </div>
                                        )}

                                        {/* Throughput bar */}
                                        {stats && (
                                            <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-700"
                                                    style={{ width: `${stats.throughput}%`, backgroundColor: color }}
                                                />
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex gap-1.5 pt-1">
                                            <button
                                                id={`btn-fault-${proc.toLowerCase()}`}
                                                onClick={() => onFaultProcessor(proc)}
                                                className="flex-1 py-1 text-[8px] font-bold rounded-md bg-[#ff0055]/10 hover:bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/20 transition-all"
                                            >
                                                FAULT
                                            </button>
                                            <button
                                                id={`btn-degrade-${proc.toLowerCase()}`}
                                                onClick={() => onDegradeProcessor(proc)}
                                                className="flex-1 py-1 text-[8px] font-bold rounded-md bg-[#ffcc00]/10 hover:bg-[#ffcc00]/20 text-[#ffcc00] border border-[#ffcc00]/20 transition-all"
                                            >
                                                DEGRADE
                                            </button>
                                            <button
                                                id={`btn-recover-${proc.toLowerCase()}`}
                                                onClick={() => onRecoverProcessor(proc)}
                                                className="flex-1 py-1 text-[8px] font-bold rounded-md bg-[#00ffaa]/10 hover:bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/20 transition-all"
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
                        <div className="space-y-3">
                            {state.missions.map(mission => (
                                <div key={mission.id} className="glass p-3 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold tracking-tight">MISSION_{mission.id}</span>
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${mission.status === 'active'
                                            ? 'bg-[#00f2ff]/20 text-[#00f2ff]'
                                            : 'bg-white/5 opacity-30'
                                            }`}>
                                            {mission.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {mission.waypoints.map((wp, i) => (
                                            <div
                                                key={i}
                                                className={`w-5 h-5 rounded-sm flex items-center justify-center text-[7px] font-bold ${wp.reached ? 'bg-[#00ffaa] text-black' : 'bg-white/5 opacity-50'
                                                    }`}
                                            >
                                                {i + 1}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-[7px] opacity-30 font-mono">
                                        {mission.waypoints.filter(w => w.reached).length}/{mission.waypoints.length} WAYPOINTS REACHED
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
