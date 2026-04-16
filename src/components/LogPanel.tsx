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
        <div className="bg-slate-900 flex flex-col h-56 rounded-xl border border-slate-700 shadow-md overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">System Diagnostics Log</span>
                </div>
                <button 
                    onClick={onClear}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-widest px-2 py-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded"
                >
                    Clear Logs
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] custom-scrollbar flex flex-col gap-1 bg-slate-900">
                {logs.length === 0 && (
                    <div className="text-slate-600 italic text-center mt-4">Awaiting telemetry...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 leading-relaxed border-l-2 border-transparent pl-2 hover:bg-slate-800/50 transition-colors py-0.5 group">
                        <span className="text-slate-500 whitespace-nowrap text-[10px] w-20">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            <span className="opacity-50">.{(log.timestamp % 1000).toString().padStart(3, '0')}</span>
                        </span>
                        <span className={`font-bold w-24 text-[10px] tracking-tight uppercase ${getServiceColor(log.service)}`}>
                            {log.service}
                        </span>
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
        case 'SENSOR': return 'text-sky-400';
        case 'NAV': return 'text-indigo-400';
        case 'CONTROL': return 'text-emerald-400';
        case 'COMM': return 'text-amber-400';
        case 'PYTHON_ENGINE': return 'text-orange-400';
        case 'KERNEL': return 'text-slate-500';
        case 'CORE_KERNEL': return 'text-slate-500';
        default: return 'text-slate-400';
    }
};

const getLevelColor = (level: string) => {
    switch (level) {
        case 'WARNING': return 'text-amber-400';
        case 'ERROR': return 'text-rose-400 font-bold';
        case 'SUCCESS': return 'text-emerald-400';
        case 'CRITICAL': return 'text-rose-500 font-bold bg-rose-500/20 px-1 rounded-sm border border-rose-500/30';
        default: return 'text-slate-300';
    }
};

export default LogPanel;
