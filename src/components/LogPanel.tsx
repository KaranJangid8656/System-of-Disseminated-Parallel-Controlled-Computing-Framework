import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types/simulation';

interface LogPanelProps {
    logs: LogEntry[];
    onClear: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, onClear }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="glass flex flex-col h-48 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-black/40 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ffaa] animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.2em] opacity-80 uppercase">SYSTEM DIAGNOSTICS LOG</span>
                </div>
                <button 
                    onClick={onClear}
                    className="text-[10px] opacity-40 hover:opacity-100 transition-opacity font-bold uppercase tracking-widest"
                >
                    CLEAR
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] custom-scrollbar flex flex-col gap-1">
                {logs.length === 0 && (
                    <div className="text-white/20 italic">Awaiting telemetry...</div>
                )}
                {logs.slice().reverse().map((log) => (
                    <div key={log.id} className="flex gap-3 leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="opacity-30 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                        <span className={`font-bold w-16 ${getModuleColor(log.module)}`}>{log.module}</span>
                        <span className={`${getTypeColor(log.type)}`}>{log.message}</span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};

const getModuleColor = (module: string) => {
    switch (module) {
        case 'SENSOR': return 'text-[#00f2ff]';
        case 'NAV': return 'text-[#7000ff]';
        case 'CONTROL': return 'text-[#00ffaa]';
        default: return 'text-white/40';
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
        case 'warning': return 'text-[#ff0055] opacity-90';
        case 'error': return 'text-[#ff0055] font-bold';
        case 'success': return 'text-[#00ffaa] opacity-90';
        default: return 'text-white/80';
    }
};

export default LogPanel;
