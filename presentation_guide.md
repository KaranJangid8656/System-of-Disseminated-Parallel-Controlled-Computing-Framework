# 🛰️ DPCC Drone Simulation: Technical Presentation Guide

This document provides a comprehensive breakdown of the **Distributed Parallel Control Computing (DPCC)** drone simulation framework, designed for high-fidelity research and reliability analysis.

---

## 1. Project Overview
The **DPCC Simulation** is a research-grade environment designed to study autonomous drone behavior under hardware degradation and communication failures. It moves beyond standard visualization by implementing a strictly **parallel, multi-processor architecture** and an **event-driven simulation kernel**.

### Core Objectives
*   **Decentralized Control**: Isolation of Sensor, Navigation, and Control logic into independent units.
*   **Reliability Research**: Real-time hardware-level fault injection and adaptation analysis.
*   **High Fidelity**: Professional tactical HUD, smooth physics, and precise mission logic.

---

## 2. Multi-Processor Architecture
The system logic is divided into four autonomous processors, simulating independent hardware nodes on a real-world UAV.

### 🧩 The Four Cores
1.  **SENSOR PROCESSOR**:
    *   **Role**: LIDAR & Spatial Awareness.
    *   **Function**: Scans the environment for obstacles and updates the drone's "Perceived Reality."
2.  **NAV PROCESSOR**:
    *   **Role**: Strategic Path Planning.
    *   **Function**: Computes steering vectors to reach Mission Waypoints while avoiding sensed obstacles.
3.  **CONTROL PROCESSOR**:
    *   **Role**: Physics & Actuation.
    *   **Function**: Applies PID-based velocity smoothing to the drone's position and manages battery/energy decay.
4.  **COMM PROCESSOR**:
    *   **Role**: Connectivity & Telemetry.
    *   **Function**: Manages the uplink to the Ground Control Station (GCS) and inter-agent data broadcasting.

---

## 3. System Working Model
The project utilizes a hybrid stack to combine high-performance analysis with a responsive real-time interface.

### 🏗️ Integration Layers
*   **Frontend (Next.js/TS)**: High-performance canvas rendering loop and interactive dashboard.
*   **Simulation Kernel**: An event-driven dispatcher that ensures deterministic execution of processor tasks.
*   **Python Research Engine (FastAPI)**: A backend analytical layer using NumPy/SciPy to perform real-time anomaly detection and "Fault Scoring."

---

## 4. Key Technical Innovations

### ⚡ Event-Driven Kernel
Unlike simple `useEffect` loops, DPCC uses a structured **Event Queue**. Every action (Scan, Compute, Apply, Uplink) is an event processed by the Kernel, allowing for precise control over timing.

### 🛠️ Hardware Fault Injection
Users can manually degrade or "kill" individual processors (`ONLINE` → `DEGRADED` → `OFFLINE`). This triggers realistic fail-over behaviors, such as **RTL (Return to Launch)** on low energy.

### 📐 Physics & Smoothing
*   **Velocity Lerping**: Eliminates jitter by smoothing the transition between commanded and actual velocity.
*   **Shortest-Path Rotation**: Optimizes rotation math to ensure the drone never "spins" excessively.

---

## 5. Visual Interface: The Tactical Dashboard
The UI is designed as a professional "Command Center" workstation:
*   **Radar HUD**: High-contrast navy finish with guide rings, distance markers, and tactile grids.
*   **Dynamic Mission Editor**: Real-time path planning via `Shift + Click`.
*   **Deep-Dive Overlays**: Full-screen diagnostic views for every processor, showing LIDAR scatter-plots, PID graphs, and memory grids.

---

## 🚀 Presentation Highlight
> *"The DPCC Framework isn't just a drone simulator; it's a parallel-computing testing bed. By isolating each hardware component's logic, we can stress-test a drone's ability to survive and finish a mission even when its critical sensors or navigation units are failing."*

---
*End of Presentation Guide*
