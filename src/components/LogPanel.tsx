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
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 leading-relaxed border-l border-white/5 pl-2 hover:bg-white/5 transition-colors">
                        <span className="opacity-20 whitespace-nowrap text-[10px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{(log.timestamp % 1000).toString().padStart(3, '0')}</span>
                        <span className={`font-bold w-20 text-[9px] tracking-tighter uppercase ${getServiceColor(log.service)}`}>{log.service}</span>
                        <span className={`flex-1 ${getLevelColor(log.level)}`}>{log.message}</span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};

const getServiceColor = (service: string) => {
    switch (service) {
        case 'SENSOR': return 'text-[#00f2ff]';
        case 'NAV': return 'text-[#7000ff]';
        case 'CONTROL': return 'text-[#00ffaa]';
        case 'COMM': return 'text-[#ffcc00]';
        case 'PYTHON_ENGINE': return 'text-[#ff6b35]';
        case 'KERNEL': return 'text-white/60';
        case 'CORE_KERNEL': return 'text-white/60';
        default: return 'text-white/40';
    }
};

const getLevelColor = (level: string) => {
    switch (level) {
        case 'WARNING': return 'text-[#ffcc00]';
        case 'ERROR': return 'text-[#ff4d00] font-bold';
        case 'SUCCESS': return 'text-[#00ffaa]';
        case 'CRITICAL': return 'text-[#ff0055] font-bold animate-pulse';
        default: return 'text-white/70';
    }
};

export default LogPanel;
