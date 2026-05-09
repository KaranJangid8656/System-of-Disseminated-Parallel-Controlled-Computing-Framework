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
      const t1 = setTimeout(() => setShowContent(true), 400);
      const t2 = setTimeout(() => setShowButton(true), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [modelLoaded]);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnterSystem, 800);
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
            <span className="topbar-label">SYSTEM ONLINE</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-label">v2.4.1</span>
            <span className="topbar-divider" />
            <span className="topbar-label">ENCRYPTED</span>
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
            DPCC FRAMEWORK
          </div>

          <h1 className={`landing-title ${showContent ? 'visible' : ''}`}>
            <span className="title-line-1">Distributed Parallel</span>
            <span className="title-line-2">Controlled Computing</span>
          </h1>

          <p className={`landing-subtitle ${showContent ? 'visible' : ''}`}>
            Multi-processor autonomous drone control system with real-time
            fault tolerance, distributed processing, and intelligent navigation.
          </p>

          {/* Stats Row */}
          <div className={`landing-stats ${showContent ? 'visible' : ''}`}>
            <div className="stat-item">
              <span className="stat-value">4</span>
              <span className="stat-label">PROCESSORS</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">60Hz</span>
              <span className="stat-label">TICK RATE</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">&lt;2ms</span>
              <span className="stat-label">LATENCY</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">N+1</span>
              <span className="stat-label">REDUNDANCY</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            className={`landing-cta ${showButton ? 'visible' : ''}`}
            onClick={handleEnter}
          >
            <span className="cta-text">ENTER CONTROL SYSTEM</span>
            <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Bottom Bar */}
        <div className={`landing-bottombar ${showContent ? 'visible' : ''}`}>
          <span className="bottombar-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            SECURE CONNECTION
          </span>
          <span className="bottombar-label mono">UAV-704 // KARAN JANGID</span>
          <span className="bottombar-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            REAL-TIME TELEMETRY
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
