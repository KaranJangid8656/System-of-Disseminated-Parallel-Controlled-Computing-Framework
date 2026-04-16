import React, { useEffect, useState } from 'react';
import { ModuleStats } from '../types/simulation';

interface ProcessorDetailOverlayProps {
    processorId: 'SENSOR' | 'NAV' | 'CONTROL' | 'COMM';
    stats: ModuleStats;
    onBack: () => void;
    onFault: () => void;
    onDegrade: () => void;
    onRecover: () => void;
    tick: number;
}

const STATUS_COLORS: Record<string, string> = {
    ONLINE: '#10b981',
    DEGRADED: '#f59e0b',
    OFFLINE: '#ef4444',
    RECOVERING: '#0ea5e9'
};

/* --- SHARED COMPONENTS --- */
const FaultPanel = ({ onFault, onDegrade, onRecover, isOnline, statusColor }: any) => (
    <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl flex flex-col gap-3 mt-8 shadow-2xl relative overflow-hidden w-72" style={{ borderLeft: `4px solid ${statusColor}` }}>
        <div className="absolute top-0 right-0 p-1 opacity-10">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45L20.14 19H3.86L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z"/></svg>
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse" />
            Reliability_Override
        </div>
        <button onClick={onDegrade} className="group relative py-3 text-[10px] font-bold tracking-widest rounded-lg bg-slate-800 text-amber-500/80 hover:text-amber-400 border border-slate-700 hover:border-amber-500/30 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 translate-y-full group-hover:translate-y-0 transition-transform" />
            INJECT_SOFT_DEGRADE
        </button>
        <button onClick={onFault} className="group relative py-3 text-[10px] font-bold tracking-widest rounded-lg bg-slate-800 text-rose-500/80 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-rose-500/5 translate-y-full group-hover:translate-y-0 transition-transform" />
            CRITICAL_HARD_FAULT
        </button>
        <div className="h-px bg-slate-800 my-1" />
        <button onClick={onRecover} disabled={isOnline} className={`py-3 text-[10px] font-bold tracking-widest rounded-lg transition-all ${isOnline ? 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500'}`}>
            INITIALIZE_AUTO_RECOVERY
        </button>
    </div>
);


/* --- SENSORS LAYOUT --- */
const SensorLayout = ({ tick, stats, errorRate }: any) => {
    const angle = (tick * 4) % 360;
    return (
        <div className="flex-1 grid grid-cols-12 gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Lidar Point Cloud */}
            <div className="col-span-8 bg-slate-900 border border-slate-700 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl group">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_100%)] z-1 pointer-events-none" />
                <div className="p-4 border-b border-slate-800 flex justify-between items-center z-10 bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                        <span className="text-sky-400 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">LIDAR_POINT_CLOUD_VX_PRIMARY</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[9px]">SAMPLE_RATE: 45.2KHz / FOV: 360°</span>
                </div>
                
                <div className="flex-1 relative flex items-center justify-center p-12">
                    {/* Radar Grid Architecture */}
                    <div className="w-full aspect-square max-w-[400px] border border-sky-900/40 rounded-full relative flex items-center justify-center">
                        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                            <div key={deg} className="absolute w-full h-px bg-sky-900/20" style={{ transform: `rotate(${deg}deg)` }} />
                        ))}
                        {[0.2, 0.4, 0.6, 0.8].map(scale => (
                            <div key={scale} className="absolute border border-sky-900/30 rounded-full" style={{ width: `${scale*100}%`, height: `${scale*100}%` }} />
                        ))}
                        
                        {/* Dynamic Sweep */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500/0 via-sky-500/5 to-sky-500/20" style={{ transform: `rotate(${angle}deg)`, transition: 'transform 0.1s linear' }} />
                        <div className="absolute inset-0 rounded-full border-r border-sky-400/40" style={{ transform: `rotate(${angle}deg)` }} />

                        {/* Point Cloud Particles */}
                        {Array.from({length: 24}).map((_, i) => {
                            const t = (i * 0.5 + tick * 0.1) % 10;
                            const r = 20 + (i % 5) * 30 + Math.sin(t) * 5;
                            const a = (i * 15 + Math.cos(tick*0.05) * 10);
                            const x = 50 + Math.cos(a * Math.PI / 180) * (r/2);
                            const y = 50 + Math.sin(a * Math.PI / 180) * (r/2);
                            const active = Math.abs((a % 360) - angle) < 40;
                            return (
                                <div key={i} className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-300 ${errorRate > 0.4 ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]' : active ? 'bg-sky-400 shadow-[0_0_12px_#38bdf8] scale-125' : 'bg-sky-900/60 scale-75'}`}
                                     style={{ left: `${x}%`, top: `${y}%` }} />
                            );
                        })}
                        <div className="w-6 h-6 bg-slate-950 border-2 border-sky-500 rounded flex items-center justify-center z-10 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                            <div className="w-2 h-2 bg-sky-400 rounded-sm animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Side Diagnostics */}
            <div className="col-span-4 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg flex-1">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gimbal Depth Matrix</span>
                        <div className="px-2 py-0.5 bg-sky-900/30 border border-sky-700/50 rounded text-sky-400 text-[9px] font-mono">FEED_01-04</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 h-48">
                        {[1,2,3,4].map(idx => (
                            <div key={idx} className="bg-slate-950 border border-slate-800 rounded relative overflow-hidden">
                                <div className="absolute top-2 left-2 text-[8px] font-mono text-sky-800 z-10">AXIS_Y_{idx}00</div>
                                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1h1v1H1V1z' fill='%2338bdf8' fill-opacity='1'/%3E%3C/svg%3E")` }} />
                                <div className="h-full flex items-end px-1 gap-0.5">
                                    {Array.from({length: 12}).map((_, bar) => (
                                        <div key={bar} className="bg-sky-500/30 w-full rounded-t-sm transition-all duration-500" 
                                             style={{ height: `${Math.random() * 80 + 10}%`, opacity: errorRate > 0.5 ? 0.2 : 0.8 }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-lg">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Processor Histogram</div>
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-slate-400">Ray Interpolation</span>
                                <span className="text-sky-400">{(98.4 - errorRate*20).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${98.4 - errorRate*20}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-slate-400">Temporal Stability</span>
                                <span className="text-emerald-400">{(92.1 - errorRate*10).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${92.1 - errorRate*10}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


/* --- NAV LAYOUT --- */
const NavLayout = ({ tick, stats, errorRate }: any) => {
    return (
        <div className="flex-1 grid grid-cols-3 gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Strategic Map View */}
            <div className="col-span-2 bg-slate-900 border border-slate-700 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                        <span className="text-indigo-400 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">Tactical_Pathfinder_Core</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-slate-500 font-mono text-[9px]">MODE: AUTONOMOUS_V3</span>
                        <span className="text-slate-500 font-mono text-[9px]">REPLAN: {(tick % 100 < 5) ? 'CALC' : 'SYNC'}</span>
                    </div>
                </div>
                <div className="flex-1 relative bg-slate-950/50" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)', backgroundSize: '32px 32px' }}>
                    <svg className="w-full h-full p-8 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                        </defs>
                        <polyline 
                            points={`0,100 20,80 40,85 60,40 80,45 100,5`} 
                            fill="none" 
                            stroke={errorRate > 0.3 ? "#ef4444" : "#6366f1"} 
                            strokeWidth="1" 
                            strokeDasharray={errorRate > 0.3 ? "2, 2" : "5, 5"}
                            filter="url(#glow)"
                        />
                        {[[20,80], [40,85], [60,40], [80,45]].map(([x,y], i) => (
                            <g key={i}>
                                <circle cx={x} cy={y} r="1.5" fill={errorRate > 0.3 ? "#ef4444" : "#818cf8"} />
                                <circle cx={x} cy={y} r="4" stroke={errorRate > 0.3 ? "#ef4444" : "#818cf8"} strokeWidth="0.5" fill="none" className="animate-ping" style={{ animationDuration: '3s' }} />
                                <text x={x+4} y={y} className="text-[4px] fill-slate-500 font-mono">WP_0{i+1}</text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>

            {/* Nav Instruments */}
            <div className="col-span-1 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center relative group">
                    <div className="absolute top-3 left-4 text-[9px] font-black text-slate-500 tracking-tighter uppercase">Bearing_Master</div>
                    <div className="w-40 h-40 rounded-full border border-indigo-900/30 relative flex items-center justify-center bg-slate-950/40 shadow-inner">
                        <div className="absolute inset-0 rounded-full border-[6px] border-indigo-900/10" />
                        {['N','E','S','W'].map((dir, i) => (
                            <span key={i} className="absolute text-[10px] font-mono font-bold text-indigo-700" style={{ transform: `rotate(${i*90}deg) translateY(-54px)` }}>{dir}</span>
                        ))}
                        {/* Needle */}
                        <div className="w-1 h-32 absolute transition-transform duration-500 ease-out" style={{ transform: `rotate(${(tick*2.5)%360}deg)` }}>
                            <div className="w-full h-1/2 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <div className="w-full h-1/2 bg-slate-800 rounded-full" />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-lg flex-1">
                    <div className="text-[10px] font-bold text-indigo-500/80 uppercase tracking-widest mb-4">Spatial Metrics</div>
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { label: 'GPS LOCK', val: `${Math.max(0, Math.floor(18 - errorRate*15))} SATS`, color: errorRate > 0.5 ? 'rose' : 'emerald' },
                            { label: 'AGL ALT', val: '142.8 M', color: 'indigo' },
                            { label: 'GRD SPEED', val: '18.4 M/S', color: 'indigo' }
                        ].map((m, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-500 font-mono">{m.label}</span>
                                    <span className={`text-xs font-bold text-${m.color}-400 font-mono`}>{m.val}</span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full">
                                    <div className={`h-full bg-${m.color}-500/50 rounded-full`} style={{ width: '70%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- CONTROL LAYOUT --- */
const Gauge = ({ value, label, min, max, color }: any) => {
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    return (
        <div className="flex flex-col items-center justify-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow">
            <svg viewBox="0 0 100 50" className="w-full text-slate-800 overflow-visible">
                {/* Background arc */}
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                {/* Foreground arc */}
                <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    strokeDasharray="125.6" 
                    strokeDashoffset={125.6 * (1 - pct/100)} 
                    className="transition-all"
                />
            </svg>
            <div className="text-2xl font-mono text-white mt-1">{value.toFixed(0)}</div>
            <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">{label}</div>
        </div>
    );
};

/* --- CONTROL LAYOUT --- */
const ControlLayout = ({ tick, stats, errorRate }: any) => {
    return (
        <div className="flex-1 flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ESC / Motor status */}
            <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map(idx => {
                    const rpm = Math.max(0, 4800 + Math.sin(tick*0.2 + idx)*200 - errorRate*5000);
                    const health = 100 - errorRate*100 - (idx === 2 ? 5 : 0);
                    return (
                        <div key={idx} className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col items-center relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-0.5 ${health < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="text-[9px] text-slate-500 font-mono uppercase font-bold tracking-[0.1em] mb-3">ESC_CHANNEL_0{idx}</span>
                            <div className="relative w-24 h-24 mb-3">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke={health < 50 ? '#ef4444' : '#10b981'} 
                                            strokeWidth="8" strokeDasharray="282.7" 
                                            strokeDashoffset={282.7 * (1 - rpm/7000)}
                                            className="transition-all duration-300" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-black text-white leading-none font-mono">{Math.round(rpm)}</span>
                                    <span className="text-[8px] text-slate-500 font-bold">RPM</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">{health.toFixed(1)}% EFF</div>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6">
                {/* PID FFT Visualizer */}
                <div className="col-span-12 bg-slate-900 border border-slate-700 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">Attitude_Stabilization_FFT</span>
                            <div className="px-2 py-0.5 bg-emerald-900/20 border border-emerald-500/30 rounded text-emerald-400 text-[9px]">PITCH / ROLL / YAW</div>
                        </div>
                        <span className="text-slate-500 font-mono text-[9px]">BAND: 100-2500Hz</span>
                    </div>
                    <div className="h-32 flex items-end gap-1 px-4">
                        {Array.from({length: 64}).map((_, i) => {
                            const val = Math.max(5, (Math.sin(i*0.2 + tick*0.3)*30 + 40) * (1 - (Math.abs(32-i)/32)) + Math.random()*10);
                            return (
                                <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
                                     style={{ 
                                        height: `${val}%`, 
                                        backgroundColor: errorRate > 0.4 ? '#ef444433' : `rgba(16, 185, 129, ${0.1 + (val/100)})`,
                                        borderTop: `1px solid ${errorRate > 0.4 ? '#ef4444' : '#10b981'}`
                                     }} />
                            );
                        })}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-6">
                        {['PITCH_P', 'ROLL_P', 'YAW_P'].map(p => (
                            <div key={p} className="bg-slate-950/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                                <span className="text-[9px] text-slate-500 font-mono uppercase">{p}</span>
                                <span className="text-xs text-white font-mono font-bold">{ (0.150 + Math.random()*0.05).toFixed(3) }</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- COMM LAYOUT --- */
/* --- COMM LAYOUT --- */
const CommLayout = ({ tick, stats, errorRate }: any) => {
    return (
        <div className="flex-1 grid grid-cols-12 gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* RF Spectrum Analyzer / Constellation */}
            <div className="col-span-4 bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-2xl">
                <div className="text-amber-400 font-mono text-[10px] font-bold tracking-[0.2em] mb-6 uppercase">QAM_64_Constellation</div>
                <div className="flex-1 relative border border-amber-900/30 rounded flex items-center justify-center p-8">
                    <div className="absolute w-px h-full bg-amber-900/20" />
                    <div className="absolute h-px w-full bg-amber-900/20" />
                    <div className="grid grid-cols-8 grid-rows-8 w-full aspect-square gap-1 opacity-60">
                         {Array.from({length: 64}).map((_, i) => {
                            const active = Math.random() > 0.3;
                            const noise = errorRate * 4;
                            const tx = (Math.random() - 0.5) * noise;
                            const ty = (Math.random() - 0.5) * noise;
                             return (
                                <div key={i} className="flex items-center justify-center relative">
                                    {active && (
                                        <div className={`w-1 h-1 rounded-full ${errorRate > 0.4 ? 'bg-rose-500' : 'bg-amber-400'}`} 
                                             style={{ transform: `translate(${tx}px, ${ty}px)` }} />
                                    )}
                                </div>
                             );
                         })}
                    </div>
                </div>
                <div className="mt-4 font-mono">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] text-slate-600">SNR_MARGIN</span>
                        <span className="text-sm font-bold text-amber-500">{(32.4 - errorRate*25).toFixed(1)} dB</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${Math.max(5, (32.4 - errorRate*25) / 40 * 100)}%` }} />
                    </div>
                </div>
            </div>

            {/* Logical Topology & Logs */}
            <div className="col-span-8 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-xl">
                    <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <span className="text-amber-400 font-mono text-[10px] font-bold tracking-[0.2em] uppercase">Mesh_Relay_Topology</span>
                        <span className="text-slate-500 font-mono text-[9px]">LID: 0xFD21A</span>
                    </div>
                    <div className="flex-1 relative flex items-center justify-center bg-slate-950/20">
                         {/* Drone Nodes */}
                         <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                            <div className="absolute w-48 h-48 border border-amber-900/10 rounded-full animate-[spin_10s_linear_infinite]" />
                            <div className="absolute w-72 h-72 border border-amber-900/10 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                            
                            {/* Center Node */}
                            <div className="w-10 h-10 rounded bg-slate-900 border border-amber-500 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                            </div>

                            {/* Orbiting Peers */}
                            {[0, 120, 240].map(deg => {
                                const r = 80;
                                const x = Math.cos(deg * Math.PI / 180) * r;
                                const y = Math.sin(deg * Math.PI / 180) * r;
                                return (
                                    <div key={deg} className={`absolute w-12 h-12 flex flex-col items-center gap-1`} style={{ transform: `translate(${x}px, ${y}px)` }}>
                                        <div className="w-2 h-2 rounded-full border border-amber-500/50 flex items-center justify-center">
                                            <div className="w-1 h-1 bg-amber-800 rounded-full" />
                                        </div>
                                        <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" style={{ transform: `rotate(${deg+90}deg)`, width: '80px', position: 'absolute', top: '4px' }} />
                                        <span className="text-[8px] font-mono text-slate-600">PEER_{deg/120 + 1}</span>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                    <div className="p-4 bg-slate-950/80 border-t border-slate-800 font-mono text-[10px] text-amber-200/40 h-24 overflow-y-auto custom-scrollbar">
                        {Array.from({length: 4}).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                                <span>DATA_RX: {Math.floor(Math.random()*256)} BYTES FROM 0x1A2... ACK_TRUE</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- MAIN OVERLAY RENDERER --- */
const ProcessorDetailOverlay: React.FC<ProcessorDetailOverlayProps> = ({
    processorId, stats, onBack, onFault, onDegrade, onRecover, tick
}) => {
    const isOnline = stats.active && stats.errorRate < 0.3;
    const status = !stats.active ? 'OFFLINE' : stats.errorRate > 0.3 ? 'DEGRADED' : 'ONLINE';
    const statusColor = STATUS_COLORS[status] || '#94a3b8';

    const TYPE_COLORS: Record<string, string> = { SENSOR: 'sky', NAV: 'indigo', CONTROL: 'emerald', COMM: 'amber' };
    const colorKey = TYPE_COLORS[processorId];

    return (
        <div className={`absolute inset-0 z-10 bg-slate-950 flex flex-col pt-0 text-slate-200 border border-${colorKey}-900/30`}>
            
            {/* Header matches Processor Theme */}
            <div className={`bg-slate-900 border-b border-slate-800 px-8 py-5 flex items-center justify-between shadow-2xl relative overflow-hidden group`}>
                <div className={`absolute top-0 left-0 w-full h-[2px] bg-${colorKey}-500 shadow-[0_0_15px_${statusColor}] z-20`} />
                <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-${colorKey}-500/10 to-transparent pointer-events-none`} />
                <div className={`absolute top-0 -left-full w-full h-[1px] bg-white/20 animate-[shimmer_3s_infinite]`} style={{ animationDelay: '1s' }} />
                
                <div className="flex items-center gap-8 z-10">
                    <button onClick={onBack} className="flex items-center text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-600 px-5 py-2.5 rounded-lg transition-all shadow-lg active:scale-95">
                        <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                        TERMINATE_SESSION
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <span className={`text-3xl font-black text-white tracking-[0.3em] font-mono`}>{processorId}</span>
                            <div className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[9px] font-mono text-slate-500 tracking-widest mt-1">UNIT_0x7FB</div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }} />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: statusColor }}>{status}_OPERATIONAL_MODE</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-10 items-center z-10">
                    <div className="text-right flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                            <div className={`text-${colorKey}-400 font-mono font-black text-4xl tabular-nums tracking-tighter`}>{stats.latency.toFixed(1)}</div>
                            <span className="text-[10px] font-bold text-slate-600">MS</span>
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">Process_Interval</div>
                    </div>
                    <div className="w-px h-12 bg-slate-800" />
                    <div className="text-right flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                            <div className="text-white font-mono font-black text-4xl tabular-nums tracking-tighter">{stats.throughput.toFixed(0)}</div>
                            <span className="text-[10px] font-bold text-slate-600">%</span>
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">Bandwidth_Util</div>
                    </div>
                </div>
            </div>


            <div className="flex-1 overflow-y-auto p-6 flex justify-center custom-scrollbar bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                <div className="w-full max-w-6xl flex flex-col h-full">
                    
                    {/* Render unique physical layout */}
                    {processorId === 'SENSOR' && <SensorLayout stats={stats} errorRate={stats.errorRate} tick={tick} />}
                    {processorId === 'NAV' && <NavLayout stats={stats} errorRate={stats.errorRate} tick={tick} />}
                    {processorId === 'CONTROL' && <ControlLayout stats={stats} errorRate={stats.errorRate} tick={tick} />}
                    {processorId === 'COMM' && <CommLayout stats={stats} errorRate={stats.errorRate} tick={tick} />}

                    {/* Shared Controls Footer */}
                    <div className="flex justify-end pt-6 mt-auto">
                        <FaultPanel onFault={onFault} onDegrade={onDegrade} onRecover={onRecover} isOnline={isOnline} statusColor={statusColor} />
                    </div>
                </div>
            </div>
            
            {status === 'OFFLINE' && (
                <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[2px] pointer-events-none flex items-center justify-center z-50">
                    <div className="text-red-500 font-black text-6xl tracking-widest uppercase border-4 border-red-500 p-8 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.5)] bg-red-950/50 backdrop-blur-md rotate-[-5deg]">
                        OFFLINE
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessorDetailOverlay;
