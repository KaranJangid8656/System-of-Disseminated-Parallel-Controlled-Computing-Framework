'use client';

import React, { useState } from 'react';
import { LogEntry, ModuleStats, TelemetryPoint, SimulationState } from '../types/simulation';

const ROLE_COLORS: Record<string, string> = {
    LEAD: '#00f2ff', SCOUT: '#ffcc00', WINGMAN: '#00ffaa', SUPPORT: '#ff6b35', RECON: '#b06cff',
};

const MODULE_COLORS: Record<string, string> = {
    SENSOR: '#00f2ff', NAV: '#7000ff', CONTROL: '#00ffaa', COMM: '#ffcc00', SWARM: '#ff6b35',
};

interface DashboardProps {
    isRunning: boolean;
    speed: number;
    sensorRange: number;
    logs: LogEntry[];
    activeModules: Record<string, boolean>;
    moduleStats: Record<string, ModuleStats>;
    stateRef: React.MutableRefObject<SimulationState>;
    telemetry: { 
        systemLoad: TelemetryPoint[], 
        threatLevel: TelemetryPoint[], 
        battery: TelemetryPoint[],
        speed: TelemetryPoint[]
    };
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    onSpeedChange: (val: number) => void;
    onRangeChange: (val: number) => void;
    onMissionStart: (index: number) => void;
    tick: number;
}

type TabId = 'overview' | 'modules' | 'missions' | 'telemetry';

const MiniChart: React.FC<{ data: TelemetryPoint[], color: string, label: string, max?: number, suffix?: string }> = ({ data, color, label, max = 100, suffix = '%' }) => {
    const W = 260, H = 60;
    if (data.length < 2) return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] opacity-50 uppercase tracking-widest">{label}</span>
            <div className="h-[60px] rounded bg-black/30 flex items-center justify-center">
                <span className="text-[9px] opacity-30">Awaiting data stream...</span>
            </div>
        </div>
    );

    const pts = data.slice(-30);
    const pathD = pts.map((p, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = H - (p.value / max) * H;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
    const areaD = `${pathD} L${W},${H} L0,${H} Z`;
    const lastVal = pts[pts.length - 1]?.value ?? 0;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] opacity-50 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] font-mono font-bold" style={{ color }}>{lastVal.toFixed(1)}{suffix}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-white/5" style={{ background: 'rgba(0,0,0,0.4)', height: '60px' }}>
                <defs>
                    <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill={`url(#grad-${label.replace(/\s/g, '')})`} />
                <path d={pathD} stroke={color} strokeWidth="2" fill="none" />
            </svg>
        </div>
    );
};

const ThreatBadge: React.FC<{ level: string }> = ({ level }) => {
    const cfg: Record<string, { color: string, label: string }> = {
        green: { color: '#00ffaa', label: 'SECURE' },
        yellow: { color: '#ffcc00', label: 'ELEVATED' },
        orange: { color: '#ff6b35', label: 'HIGH' },
        red: { color: '#ff0055', label: 'CRITICAL' },
    };
    const c = cfg[level] ?? cfg.green;
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${c.color}15`, border: `1px solid ${c.color}40` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: c.color }}>{c.label}</span>
        </div>
    );
};

export default function Dashboard({
    isRunning, speed, sensorRange, logs, activeModules, moduleStats, stateRef,
    telemetry, onStart, onStop, onReset, onSpeedChange, onRangeChange, onMissionStart, tick,
}: DashboardProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    const state = stateRef.current;
    const drone = state.drone;
    const elapsedSec = Math.floor(state.elapsedTime / 1000);
    const elapsedStr = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

    const tabs: { id: TabId, label: string }[] = [
        { id: 'overview', label: 'STATUS' },
        { id: 'modules', label: 'DPCC PIPELINE' },
        { id: 'missions', label: 'MISSIONS' },
        { id: 'telemetry', label: 'TELEMETRY' },
    ];

    return (
        <aside className="w-[320px] flex flex-col gap-3 h-full overflow-hidden">
            {/* Tabs */}
            <div className="glass rounded-xl p-1 flex gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex-1 py-1.5 rounded-lg text-[8px] font-bold tracking-widest transition-all"
                        style={{
                            background: activeTab === tab.id ? 'rgba(0,242,255,0.15)' : 'transparent',
                            color: activeTab === tab.id ? '#00f2ff' : 'rgba(255,255,255,0.35)',
                            border: activeTab === tab.id ? '1px solid rgba(0,242,255,0.3)' : '1px solid transparent',
                        }}
                    >{tab.label}</button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-0.5">
                {/* ─── TAB: OVERVIEW ─── */}
                {activeTab === 'overview' && (
                    <>
                        {/* Mission Control */}
                        <div className="glass p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">MISSION CONTROL</h3>
                                <ThreatBadge level={state.threatLevel} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-white">
                                {[
                                    { label: 'UNIT', value: drone.id },
                                    { label: 'ELAPSED', value: elapsedStr },
                                    { label: 'BATTERY', value: `${drone.battery.toFixed(0)}%` },
                                ].map(s => (
                                    <div key={s.label} className="bg-black/30 rounded-lg p-2 border border-white/5">
                                        <div className="text-[12px] font-bold font-mono text-[#00f2ff]">{s.value}</div>
                                        <div className="text-[8px] opacity-40 tracking-widest uppercase">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                {!isRunning ? (
                                    <button onClick={onStart}
                                        className="w-full py-3 rounded-lg font-bold text-xs tracking-widest transition-all active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #00f2ff, #00ffaa)', color: '#040d18', boxShadow: '0 0 20px rgba(0,242,255,0.3)' }}>
                                        ▶ ACTIVATE SYSTEMS
                                    </button>
                                ) : (
                                    <button onClick={onStop}
                                        className="w-full py-3 rounded-lg font-bold text-xs tracking-widest transition-all active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #ff0055, #ff6b35)', color: '#fff', boxShadow: '0 0 20px rgba(255,0,85,0.3)' }}>
                                        ⬛ ABORT ALL OPERATIONS
                                    </button>
                                )}
                                <button onClick={onReset}
                                    className="w-full py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all hover:bg-white/10"
                                    style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>
                                    ↺ EMERGENCY RESET
                                </button>
                            </div>
                        </div>

                        {/* Drone Status */}
                        <div className="glass p-4 rounded-xl flex flex-col gap-3">
                            <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">TELEMETRY FEED</h3>
                            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-3 h-3 rounded bg-[#00f2ff] shadow-[0_0_8px_#00f2ff]" />
                                    <span className="text-[11px] font-bold font-mono text-[#00f2ff]">{drone.id} STATUS</span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                  {[
                                    { l: 'STATUS', v: drone.status.replace('_', ' ').toUpperCase() },
                                    { l: 'ALTITUDE', v: `${drone.altitude.toFixed(0)}m` },
                                    { l: 'HEADING', v: `${drone.heading.toFixed(0)}°` },
                                    { l: 'DISTANCE', v: `${drone.totalDistanceTraveled.toFixed(0)}px` },
                                    { l: 'SIGNAL', v: `${drone.signalStrength.toFixed(0)}%` },
                                    { l: 'HEALTH', v: `${drone.health}%` },
                                  ].map(i => (
                                    <div key={i.l}>
                                      <div className="text-[7px] opacity-40 tracking-widest mb-0.5">{i.l}</div>
                                      <div className="text-[10px] font-mono font-bold">{i.v}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4">
                                  <div className="flex justify-between text-[8px] mb-1">
                                    <span className="opacity-40">BATTERY RESERVE</span>
                                    <span className={drone.battery < 20 ? 'text-[#ff0055]' : 'text-[#00ffaa]'}>{drone.battery.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full transition-all duration-500" style={{ 
                                      width: `${drone.battery}%`, 
                                      background: drone.battery > 50 ? '#00ffaa' : drone.battery > 25 ? '#ffcc00' : '#ff0055' 
                                    }} />
                                  </div>
                                </div>
                            </div>
                        </div>

                        {/* Parameters */}
                        <div className="glass p-4 rounded-xl flex flex-col gap-4">
                            <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">SYSTEM PARAMETERS</h3>
                            
                            {/* Speed */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[9px]">
                                    <label className="opacity-60 uppercase tracking-widest">Target Velocity</label>
                                    <span style={{ color: '#00f2ff' }} className="font-mono font-bold">{speed.toFixed(1)} u/t</span>
                                </div>
                                <input type="range" min="0.5" max="10" step="0.5" value={speed}
                                    onChange={e => onSpeedChange(parseFloat(e.target.value))}
                                    className="w-full accent-[#00f2ff]" />
                            </div>

                            {/* Sensor Range */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[9px]">
                                    <label className="opacity-60 uppercase tracking-widest">Active LiDAR Scan Range</label>
                                    <span style={{ color: '#00f2ff' }} className="font-mono font-bold">{sensorRange}px</span>
                                </div>
                                <input type="range" min="40" max="220" step="10" value={sensorRange}
                                    onChange={e => onRangeChange(parseInt(e.target.value))}
                                    className="w-full accent-[#00f2ff]" />
                            </div>
                        </div>
                    </>
                )}

                {/* ─── TAB: MODULES ─── */}
                {activeTab === 'modules' && (
                    <>
                        <div className="glass p-4 rounded-xl flex flex-col gap-3">
                            <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">DPCC PIPELINE ARCHITECTURE</h3>
                            <div className="flex flex-col gap-2.5">
                                {Object.entries(moduleStats).map(([key, stat]) => {
                                    const color = MODULE_COLORS[key] ?? '#fff';
                                    const isActive = activeModules[key.toLowerCase()] ?? false;
                                    return (
                                        <div key={key} className="p-3 rounded-lg transition-all duration-200"
                                            style={{
                                                background: isActive ? `${color}12` : 'rgba(0,0,0,0.3)',
                                                border: `1px solid ${isActive ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                                                boxShadow: isActive ? `0 0 15px ${color}15` : 'none',
                                            }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                                                        style={{ background: isActive ? color : '#333', boxShadow: isActive ? `0 0 8px ${color}` : 'none' }} />
                                                    <span className="text-[10px] font-bold tracking-widest" style={{ color: isActive ? color : 'rgba(255,255,255,0.4)' }}>{key}</span>
                                                </div>
                                                <span className="text-[8px] opacity-40 font-mono">{stat.frequency}</span>
                                            </div>
                                            <p className="text-[8px] opacity-40 mb-3 leading-relaxed border-l border-white/10 pl-2">{stat.description}</p>
                                            <div className="grid grid-cols-3 gap-1 text-center">
                                                {[
                                                    { l: 'EXECS', v: stat.executions },
                                                    { l: 'LATENCY', v: `${stat.avgLatency.toFixed(1)}ms` },
                                                    { l: 'LOAD', v: `${stat.load.toFixed(0)}%` },
                                                ].map(s => (
                                                    <div key={s.l} className="bg-black/30 rounded p-1">
                                                        <div className="text-[11px] font-mono font-bold text-white/90">{s.v}</div>
                                                        <div className="text-[7px] opacity-30 uppercase tracking-tighter">{s.l}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Load bar */}
                                            <div className="mt-3 h-1 rounded-full bg-black/50">
                                                <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${stat.load}%`, background: color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="glass p-4 rounded-xl">
                            <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff] mb-2">SYSTEM DESIGN</h3>
                            <p className="text-[9px] opacity-40 leading-relaxed font-medium">
                                This simulation implements a <span className="text-[#00f2ff]">true DPCC framework</span>. 
                                Each module operates as a separate asynchronous task loop. 
                                Communication is handled via a shared, thread-safe memory state model.
                            </p>
                        </div>
                    </>
                )}

                {/* ─── TAB: MISSIONS ─── */}
                {activeTab === 'missions' && (
                    <div className="flex flex-col gap-3">
                        <div className="glass p-4 rounded-xl flex flex-col gap-3">
                            <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">AVAILABLE MISSIONS</h3>
                            {state.missions.map((mission, idx) => {
                                const statusColors: Record<string, string> = {
                                    pending: '#ffcc00', active: '#00f2ff', completed: '#00ffaa', failed: '#ff0055'
                                };
                                const sColor = statusColors[mission.status] ?? '#fff';
                                const completed = mission.waypoints.filter(w => w.reached).length;
                                const isActive = mission.status === 'active';

                                return (
                                    <div key={mission.id} className="p-3 rounded-lg overflow-hidden transition-all" 
                                        style={{ 
                                            background: isActive ? 'rgba(0,242,255,0.05)' : 'rgba(0,0,0,0.3)', 
                                            border: `1px solid ${isActive ? '#00f2ff50' : 'rgba(255,255,255,0.06)'}` 
                                        }}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold" style={{ color: isActive ? '#fff' : sColor }}>{mission.name}</span>
                                                    <span className="text-[7px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${sColor}20`, color: sColor }}>{mission.priority.toUpperCase()}</span>
                                                </div>
                                                <p className="text-[8px] opacity-40 mt-1 leading-normal">{mission.description}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 flex items-center gap-3">
                                          <div className="flex-1">
                                            <div className="flex justify-between text-[7px] mb-1 opacity-50 font-bold uppercase tracking-widest">
                                              <span>OBJECTIVES</span>
                                              <span>{completed}/{mission.waypoints.length}</span>
                                            </div>
                                            <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
                                              <div className="h-full transition-all duration-500" style={{ 
                                                width: `${(completed / mission.waypoints.length) * 100}%`,
                                                background: sColor
                                              }} />
                                            </div>
                                          </div>
                                          
                                          {mission.status === 'pending' && (
                                            <button 
                                              onClick={() => onMissionStart(idx)}
                                              className="px-3 py-1.5 rounded bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/30 text-[9px] font-bold tracking-tighter transition-all"
                                              style={{ color: '#00f2ff' }}
                                            >ASSIGN</button>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-1 mt-3">
                                            {mission.waypoints.map(wp => (
                                                <div key={wp.id} className="text-[7px] px-2 py-1 rounded font-mono flex items-center gap-1.5" style={{
                                                    background: wp.reached ? '#00ffaa15' : 'rgba(0,0,0,0.2)',
                                                    color: wp.reached ? '#00ffaa' : 'rgba(255,255,255,0.3)',
                                                    border: `1px solid ${wp.reached ? '#00ffaa30' : 'rgba(255,255,255,0.04)'}`,
                                                }}>
                                                    <div className={`w-1 h-1 rounded-full ${wp.reached ? 'bg-[#00ffaa]' : 'bg-white/20'}`} />
                                                    {wp.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── TAB: TELEMETRY ─── */}
                {activeTab === 'telemetry' && (
                    <div className="flex flex-col gap-3">
                        <div className="glass p-4 rounded-xl flex flex-col gap-4">
                            <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">SYSTEM TELEMETRY</h3>
                            <MiniChart data={telemetry.systemLoad} color="#00f2ff" label="DPCC CPU LOAD" />
                            <MiniChart data={telemetry.threatLevel} color="#ff0055" label="LiDAR THREAT INDEX" />
                            <MiniChart data={telemetry.battery} color="#00ffaa" label="UNIT ENERGY SOURCE" />
                            <MiniChart data={telemetry.speed} color="#ffcc00" label="VELOCITY MAGNITUDE" suffix=" units" />
                        </div>
                        
                        <div className="p-4 rounded-xl glass border border-white/5 space-y-3">
                          <h3 className="text-[10px] font-bold tracking-widest text-[#00f2ff]">UNIT LOGS</h3>
                          <div className="space-y-1">
                            {logs.slice(0, 10).map(log => (
                              <div key={log.id} className="text-[8px] font-mono leading-tight opacity-50 flex gap-2">
                                <span className="opacity-40">[{log.module}]</span>
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

