from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DPCC Multi-Processor Research Engine", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Data Models ──────────────────────────────────────────────────────

class Vector2D(BaseModel):
    x: float
    y: float

class ProcessorTelemetry(BaseModel):
    status: str          # ONLINE | DEGRADED | OFFLINE | RECOVERING
    errorRate: float     # 0.0 – 1.0

class AgentState(BaseModel):
    id: str
    pos: Vector2D
    velocity: Vector2D
    energy: float
    heading: float
    processors: Optional[Dict[str, ProcessorTelemetry]] = None

class SimulationPacket(BaseModel):
    agents: List[AgentState]
    timestamp: float

# ── Endpoints ────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ONLINE", "version": "3.0-MULTI-PROC"}


@app.post("/adaptation/optimize")
async def optimize_parameters(packet: SimulationPacket):
    """
    Multi-Processor Meta-Optimisation:
    1. Computes swarm velocity stress (spectral proxy λ̂₂).
    2. Computes system-wide processor fault score.
    3. Returns delta_theta and regime classification.
    """
    try:
        stress_levels = []
        fault_score = 0.0
        processor_report = {}

        for agent in packet.agents:
            vel = agent.velocity
            vel_mag = np.sqrt(vel.x ** 2 + vel.y ** 2)
            stress_levels.append(vel_mag)

            # Analyse processor health if provided
            if agent.processors:
                offline = sum(1 for p in agent.processors.values() if p.status == "OFFLINE")
                degraded = sum(1 for p in agent.processors.values() if p.status == "DEGRADED")
                error_rates = [p.errorRate for p in agent.processors.values()]
                mean_err = float(np.mean(error_rates)) if error_rates else 0.0

                fault_score = (offline * 1.0 + degraded * 0.5 + mean_err)

                for proc_id, health in agent.processors.items():
                    processor_report[proc_id] = {
                        "status": health.status,
                        "errorRate": round(health.errorRate, 3),
                    }

        mean_stress = float(np.mean(stress_levels)) if stress_levels else 0.0

        # Regime classification
        if fault_score > 2.0:
            regime = "CRITICAL_FAULT"
        elif fault_score > 1.0:
            regime = "DEGRADED_RELIABILITY"
        elif mean_stress > 2.5:
            regime = "STRESSED"
        elif mean_stress < 1.0:
            regime = "EXPLORATORY"
        else:
            regime = "NOMINAL"

        # delta_theta: negative means dampen velocity (stabilise), positive means allow more
        if fault_score > 1.5:
            delta_theta = -0.25       # heavy damping — system unreliable
        elif fault_score > 0.5 or mean_stress > 2.5:
            delta_theta = -0.10       # moderate damping
        else:
            delta_theta = 0.05        # mild encouragement

        spectral_proxy = mean_stress / 5.0

        return {
            "delta_theta": round(delta_theta, 4),
            "regime": regime,
            "spectral_proxy": round(spectral_proxy, 4),
            "fault_score": round(fault_score, 4),
            "processor_report": processor_report,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/anomaly/detect")
async def detect_anomaly(packet: SimulationPacket):
    """
    Dedicated anomaly detection endpoint.
    Returns anomaly flags per processor.
    """
    try:
        anomalies = []
        for agent in packet.agents:
            if not agent.processors:
                continue
            for proc_id, health in agent.processors.items():
                if health.status == "OFFLINE":
                    anomalies.append({
                        "agentId": agent.id,
                        "processor": proc_id,
                        "severity": "CRITICAL",
                        "message": f"{proc_id} PROCESSOR OFFLINE — RELIABILITY DEGRADED",
                    })
                elif health.errorRate > 0.3:
                    anomalies.append({
                        "agentId": agent.id,
                        "processor": proc_id,
                        "severity": "WARNING",
                        "message": f"{proc_id} HIGH ERROR RATE: {health.errorRate:.0%}",
                    })
        return {"anomalies": anomalies, "count": len(anomalies)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
