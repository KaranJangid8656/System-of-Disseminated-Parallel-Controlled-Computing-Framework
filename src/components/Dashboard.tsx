import React from 'react';
import { LogEntry } from '../types/simulation';

interface DashboardProps {
    isRunning: boolean;
    speed: number;
    sensorRange: number;
    logs: LogEntry[];
    activeModules: {
        sensor: boolean;
        navigation: boolean;
        control: boolean;
    };
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    onSpeedChange: (val: number) => void;
    onRangeChange: (val: number) => void;
    onClearLogs: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    isRunning,
    speed,
    sensorRange,
    logs,
    activeModules,
    onStart,
    onStop,
    onReset,
    onSpeedChange,
    onRangeChange,
    onClearLogs
}) => {
    return (
        <aside className="w-80 flex flex-col gap-6 h-full p-4 overflow-y-auto custom-scrollbar">
            {/* Module Status */}
            <div className="glass p-4 rounded-xl flex flex-col gap-4">
                <h3 className="text-sm font-bold tracking-widest text-[#00f2ff]">MODULE ACTIVITY</h3>
                <div className="grid grid-cols-1 gap-3">
                    <ModuleCard 
                        name="SENSOR" 
                        freq="300ms" 
                        isActive={activeModules.sensor} 
                        color="#00f2ff" 
                    />
                    <ModuleCard 
                        name="NAVIGATION" 
                        freq="100ms" 
                        isActive={activeModules.navigation} 
                        color="#7000ff" 
                    />
                    <ModuleCard 
                        name="CONTROL" 
                        freq="50ms" 
                        isActive={activeModules.control} 
                        color="#00ffaa" 
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="glass p-4 rounded-xl flex flex-col gap-4">
                <h3 className="text-sm font-bold tracking-widest text-[#00f2ff]">CONTROLS</h3>
                <div className="flex flex-col gap-2">
                    {!isRunning ? (
                        <button 
                            onClick={onStart}
                            className="w-full bg-[#00f2ff] text-[#050b14] font-bold py-3 rounded-lg hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] transition-all active:scale-95"
                        >
                            START MISSION
                        </button>
                    ) : (
                        <button 
                            onClick={onStop}
                            className="w-full bg-[#ff0055] text-white font-bold py-3 rounded-lg hover:shadow-[0_0_20px_rgba(255,0,85,0.5)] transition-all active:scale-95"
                        >
                            ABORT MISSION
                        </button>
                    )}
                    <button 
                        onClick={onReset}
                        className="w-full border border-white/20 hover:bg-white/10 py-2 rounded-lg transition-all text-sm"
                    >
                        RESET ENV
                    </button>
                </div>
            </div>

            {/* Parameters */}
            <div className="glass p-4 rounded-xl flex flex-col gap-4">
                <h3 className="text-sm font-bold tracking-widest text-[#00f2ff]">PARAMETERS</h3>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                            <label className="opacity-70">SPEED</label>
                            <span className="text-[#00f2ff]">{speed.toFixed(1)}x</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="8" 
                            step="0.5" 
                            value={speed}
                            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                            className="w-full accent-[#00f2ff]"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                            <label className="opacity-70">SENSOR RANGE</label>
                            <span className="text-[#00f2ff]">{sensorRange}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="40" 
                            max="200" 
                            step="10" 
                            value={sensorRange}
                            onChange={(e) => onRangeChange(parseInt(e.target.value))}
                            className="w-full accent-[#00f2ff]"
                        />
                    </div>
                </div>
            </div>

            {/* Instruction */}
            <div className="p-4 rounded-xl border border-[#00f2ff]/20 bg-[#00f2ff]/5">
                <p className="text-[10px] uppercase opacity-60 leading-relaxed font-semibold">
                    [INFO]: Click on map to deploy obstacles. <br/>
                    Right-click to move target.
                </p>
            </div>
        </aside>
    );
};

interface ModuleCardProps {
    name: string;
    freq: string;
    isActive: boolean;
    color: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ name, freq, isActive, color }) => (
    <div className={`p-3 rounded-lg border transition-all duration-150 ${isActive ? 'bg-white/10 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/20 border-white/5'}`}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div 
                    className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]"
                    style={{ color: isActive ? color : '#333', backgroundColor: isActive ? color : '#333' }}
                />
                <span className={`text-[10px] font-bold tracking-widest ${isActive ? 'text-white' : 'opacity-40'}`}>{name}</span>
            </div>
            <span className="text-[8px] opacity-40 font-mono tracking-tighter">{freq}</span>
        </div>
    </div>
);

export default Dashboard;
