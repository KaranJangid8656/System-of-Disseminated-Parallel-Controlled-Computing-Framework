'use client';

import React, { useState } from 'react';
import { FIRMWARE_TEMPLATES } from '../lib/dpcc/firmware/FirmwareTemplates';

interface FirmwareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FirmwareModal({ isOpen, onClose }: FirmwareModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>('SENSOR');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTemplate = FIRMWARE_TEMPLATES[selectedKey] || FIRMWARE_TEMPLATES.SENSOR;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTemplate.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([currentTemplate.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `dpcc_${selectedKey.toLowerCase()}_node.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-50">⚡ C++ Microcontroller Firmware Suite</h2>
            <p className="text-xs text-zinc-400">Flash these `.ino` sketches to ESP32 / Arduino boards for hardware-in-the-loop operation.</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition"
          >
            Close ✕
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-6 pt-3 gap-2">
          {Object.keys(FIRMWARE_TEMPLATES).map((key) => {
            const tmpl = FIRMWARE_TEMPLATES[key];
            const isActive = selectedKey === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  isActive
                    ? 'border-t-2 border-emerald-400 bg-zinc-900 text-emerald-300'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                {tmpl.id} Node
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col overflow-hidden p-6 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-zinc-100">{currentTemplate.name}</h3>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">Target Hardware: {currentTemplate.targetBoard}</p>
              <p className="text-xs text-zinc-400 mt-1">{currentTemplate.description}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                {copied ? '✓ Copied Code' : '📋 Copy C++ Code'}
              </button>
              <button
                onClick={handleDownload}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition"
              >
                💾 Download .ino File
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300/90 overflow-y-auto custom-scrollbar leading-relaxed">
            <pre><code>{currentTemplate.code}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}
