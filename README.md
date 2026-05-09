# System of Disseminated Parallel Controlled Computing Framework (DPCC)

## 🛰️ Project Overview
The **DPCC Simulation** is a research-grade environment designed to study autonomous drone behavior under hardware degradation and communication failures. It moves beyond standard visualization by implementing a strictly **parallel, multi-processor architecture** and an **event-driven simulation kernel**.

This framework serves as a parallel-computing testing bed. By isolating each hardware component's logic, it allows for stress-testing a drone's ability to survive and finish a mission even when its critical sensors or navigation units are failing.

### Core Objectives
*   **Decentralized Control**: Isolation of Sensor, Navigation, and Control logic into independent units.
*   **Reliability Research**: Real-time hardware-level fault injection and adaptation analysis.
*   **High Fidelity**: Professional tactical HUD, smooth physics, and precise mission logic.

## 🏗️ Architecture
The system utilizes a hybrid stack combining high-performance analysis with a responsive real-time interface:
*   **Frontend (Next.js/React-Three-Fiber)**: High-performance 3D canvas rendering loop and interactive tactical dashboard.
*   **Simulation Kernel**: An event-driven dispatcher ensuring deterministic execution of processor tasks.
*   **Python Research Engine (FastAPI)**: A backend analytical layer utilizing real-time anomaly detection and "Fault Scoring."

### 🧩 Multi-Processor Node Architecture
System logic is divided into four autonomous processors, simulating independent hardware nodes on a real-world UAV:
1.  **SENSOR PROCESSOR**: LIDAR & Spatial Awareness. Scans for obstacles and updates "Perceived Reality."
2.  **NAV PROCESSOR**: Strategic Path Planning. Computes vectors to reach waypoints while avoiding obstacles.
3.  **CONTROL PROCESSOR**: Physics & Actuation. Applies PID-based velocity smoothing and manages battery/energy decay.
4.  **COMM PROCESSOR**: Connectivity & Telemetry. Manages the uplink to the Ground Control Station (GCS).

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Python](https://www.python.org/) (3.8+)

### 1. Running the Frontend (Next.js)

First, install the web application dependencies in the root directory:
```bash
npm install
```

Start the development server:
```bash
npm run dev
# or yarn dev / pnpm dev / bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the Tactical Command Center and Drone Simulation.

### 2. Running the Python Research Engine

The backend API is required for real-time fault scoring and advanced analytics.

**On Windows:**
Simply execute the provided batch script in the root directory to initialize the virtual environment and start the server automatically:
```bash
cmd /c run_research_engine.bat
```

**Manual Setup (All Platforms):**
```bash
cd python_engine
python -m venv venv

# Activate virtual environment
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS / Linux

# Install dependencies and run
pip install -r requirements.txt
python main.py
```
The Python research engine starts by default on `http://localhost:8000`.

## 🛠️ Key Technical Innovations
* **Event-Driven Kernel**: Processor actions (Scan, Compute, Apply, Uplink) are handled via a structured Event Queue rather than standard view loops, providing deterministic timing control.
* **Hardware Fault Injection**: Allows manual degradation of individual processors (`ONLINE` → `DEGRADED` → `OFFLINE`) to observe robust fail-over behaviors like RTL (Return to Launch).
* **Physics & Smoothing**: Integrated real-time velocity lerping and shortest-path rotation mathematics to ensure true-to-life dynamic flight responses.
