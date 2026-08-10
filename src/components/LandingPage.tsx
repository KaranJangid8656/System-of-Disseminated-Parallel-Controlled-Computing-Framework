'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

const DroneScene = dynamic(() => import('./DroneScene'), { ssr: false });

interface LandingPageProps {
  onEnterSystem: () => void;
}

export default function LandingPage({ onEnterSystem }: LandingPageProps) {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleModelLoaded = useCallback(() => {
    setModelLoaded(true);
  }, []);

  useEffect(() => {
    if (modelLoaded) {
      const t1 = setTimeout(() => setShowContent(true), 300);
      const t2 = setTimeout(() => setShowButton(true), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [modelLoaded]);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnterSystem, 600);
  };

  return (
    <div className={`landing-root ${exiting ? 'landing-exit' : ''}`}>
      {/* 3D Canvas Background */}
      <div className="landing-canvas-container">
        <DroneScene onModelLoaded={handleModelLoaded} />
      </div>

      {/* Overlay Gradient */}
      <div className="landing-overlay" />

      {/* Scan Lines Effect */}
      <div className="landing-scanlines" />

      {/* Content */}
      <div className="landing-content">
        {/* Top Bar */}
        <div className={`landing-topbar ${showContent ? 'visible' : ''}`}>
          <div className="topbar-left">
            <span className="topbar-status-dot" />
            <span className="topbar-label">SYSTEM ONLINE // IoT HIL BRIDGE READY</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-label">v3.0-HIL</span>
            <span className="topbar-divider" />
            <span className="topbar-label">ESP32 / ARDUINO / WEBSERIAL</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="landing-center">
          <div className={`landing-badge ${showContent ? 'visible' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            DPCC PARALLEL COMPUTING & IOT FRAMEWORK
          </div>

          <h1 className={`landing-title ${showContent ? 'visible' : ''}`}>
            <span className="title-line-1">System of Disseminated</span>
            <span className="title-line-2">Parallel Controlled Computing</span>
          </h1>

          <p className={`landing-subtitle ${showContent ? 'visible' : ''}`}>
            Hardware-in-the-Loop (HIL) multi-processor autonomous control system.
            Connect physical microcontrollers (ESP32, Arduino, STM32) over WebSerial, WebSockets & MAVLink.
          </p>

          {/* IoT & Parallel Hardware Features */}
          <div className={`landing-stats ${showContent ? 'visible' : ''}`}>
            <div className="stat-item">
              <span className="stat-value">4 NODES</span>
              <span className="stat-label">ESP32 / ARDUINO</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">WebSerial</span>
              <span className="stat-label">USB 115200 BAUD</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">Closed-Loop</span>
              <span className="stat-label">PID CONTROLLER</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">MAVLink</span>
              <span className="stat-label">GPS & IMU TELEMETRY</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center items-center mt-6">
            <button
              className={`landing-cta ${showButton ? 'visible' : ''}`}
              onClick={handleEnter}
            >
              <span className="cta-text">ENTER TACTICAL & IOT CONTROL SYSTEM</span>
              <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`landing-bottombar ${showContent ? 'visible' : ''}`}>
          <span className="bottombar-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            HARDWARE-IN-THE-LOOP (HIL)
          </span>
          <span className="bottombar-label mono">UAV-704 // KARAN JANGID</span>
          <span className="bottombar-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            REAL-TIME SERIAL TELEMETRY STREAM
          </span>
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="corner-decoration top-left" />
      <div className="corner-decoration top-right" />
      <div className="corner-decoration bottom-left" />
      <div className="corner-decoration bottom-right" />
    </div>
  );
}
