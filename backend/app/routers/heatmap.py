from __future__ import annotations

import math
from typing import List, Optional
from fastapi import APIRouter, Query

from app.schemas.heatmap import HeatmapPointOut, RiskZoneOut, CrimeClusterOut

router = APIRouter(prefix="/heatmap", tags=["heatmap"])

# ── Official SMC Ward & Sector Segmentation Polygons ──────────────────────────
MOCK_ZONES = [
    {
        "name": "Kosad / Katargam North",
        "lat": 21.300,
        "lng": 72.840,
        "risk_score": 55.0,
        "level": "MODERATE",
        "boundary": [
            [21.320, 72.825],
            [21.320, 72.855],
            [21.285, 72.855],
            [21.285, 72.830],
        ],
    },
    {
        "name": "Katargam Central",
        "lat": 21.265,
        "lng": 72.845,
        "risk_score": 51.0,
        "level": "MODERATE",
        "boundary": [
            [21.285, 72.830],
            [21.285, 72.855],
            [21.265, 72.880],
            [21.245, 72.855],
            [21.255, 72.820],
        ],
    },
    {
        "name": "Rander & Jahangirpura",
        "lat": 21.250,
        "lng": 72.785,
        "risk_score": 56.0,
        "level": "MODERATE",
        "boundary": [
            [21.290, 72.820],
            [21.255, 72.820],
            [21.225, 72.795],
            [21.250, 72.770],
            [21.265, 72.795],
        ],
    },
    {
        "name": "Varachha & Sarthana",
        "lat": 21.255,
        "lng": 72.905,
        "risk_score": 64.0,
        "level": "MODERATE",
        "boundary": [
            [21.285, 72.855],
            [21.295, 72.880],
            [21.270, 72.890],
            [21.280, 72.920],
            [21.250, 72.945],
            [21.235, 72.920],
            [21.225, 72.875],
            [21.245, 72.855],
        ],
    },
    {
        "name": "Adajan & Palanpur",
        "lat": 21.200,
        "lng": 72.780,
        "risk_score": 31.0,
        "level": "SAFE",
        "boundary": [
            [21.225, 72.795],
            [21.215, 72.825],
            [21.185, 72.810],
            [21.190, 72.760],
            [21.205, 72.780],
        ],
    },
    {
        "name": "City Core (Chowk Bazaar)",
        "lat": 21.215,
        "lng": 72.835,
        "risk_score": 72.0,
        "level": "HIGH",
        "boundary": [
            [21.245, 72.855],
            [21.225, 72.875],
            [21.195, 72.855],
            [21.185, 72.810],
            [21.215, 72.825],
        ],
    },
    {
        "name": "Athwa & Vesu",
        "lat": 21.165,
        "lng": 72.795,
        "risk_score": 80.0,
        "level": "HIGH",
        "boundary": [
            [21.190, 72.760],
            [21.185, 72.810],
            [21.170, 72.845],
            [21.135, 72.840],
            [21.145, 72.760],
            [21.160, 72.775],
        ],
    },
    {
        "name": "Dumas & Magdalla (West Arm)",
        "lat": 21.120,
        "lng": 72.735,
        "risk_score": 28.0,
        "level": "SAFE",
        "boundary": [
            [21.145, 72.760],
            [21.135, 72.840],
            [21.090, 72.810],
            [21.100, 72.765],
            [21.090, 72.705],
            [21.135, 72.700],
        ],
    },
    {
        "name": "Limbayat & Dindoli",
        "lat": 21.185,
        "lng": 72.890,
        "risk_score": 38.0,
        "level": "SAFE",
        "boundary": [
            [21.225, 72.875],
            [21.230, 72.940],
            [21.210, 72.915],
            [21.190, 72.905],
            [21.165, 72.910],
            [21.170, 72.845],
            [21.195, 72.855],
        ],
    },
    {
        "name": "Udhna Industrial Sector",
        "lat": 21.145,
        "lng": 72.880,
        "risk_score": 45.0,
        "level": "MODERATE",
        "boundary": [
            [21.170, 72.845],
            [21.165, 72.910],
            [21.145, 72.925],
            [21.115, 72.890],
            [21.120, 72.845],
            [21.135, 72.840],
        ],
    },
    {
        "name": "Pandesara Sector",
        "lat": 21.110,
        "lng": 72.815,
        "risk_score": 41.0,
        "level": "MODERATE",
        "boundary": [
            [21.135, 72.840],
            [21.120, 72.845],
            [21.115, 72.890],
            [21.095, 72.875],
            [21.080, 72.825],
            [21.090, 72.810],
        ],
    },
    {
        "name": "Bhestan & Sachin Sector",
        "lat": 21.065,
        "lng": 72.848,
        "risk_score": 35.0,
        "level": "SAFE",
        "boundary": [
            [21.095, 72.875],
            [21.050, 72.860],
            [21.050, 72.835],
            [21.080, 72.825],
        ],
    },
]

MOCK_CLUSTERS = [
    {"district": "Athwa & Vesu", "count": 80, "dominant_type": "Cyber Fraud", "lat": 21.165, "lng": 72.795, "trend": [12, 14, 11, 15, 18, 16, 20]},
    {"district": "City Core (Chowk Bazaar)", "count": 72, "dominant_type": "Robbery", "lat": 21.215, "lng": 72.835, "trend": [10, 11, 13, 14, 12, 15, 18]},
    {"district": "Varachha & Sarthana", "count": 58, "dominant_type": "Chain Snatching", "lat": 21.255, "lng": 72.905, "trend": [8, 9, 7, 10, 11, 9, 14]},
    {"district": "Rander & Jahangirpura", "count": 54, "dominant_type": "Extortion", "lat": 21.250, "lng": 72.785, "trend": [6, 8, 9, 11, 10, 12, 13]},
    {"district": "Katargam Central", "count": 45, "dominant_type": "Vehicle Theft", "lat": 21.265, "lng": 72.845, "trend": [5, 6, 8, 7, 9, 8, 10]},
    {"district": "Udhna Industrial Sector", "count": 41, "dominant_type": "Assault", "lat": 21.145, "lng": 72.880, "trend": [4, 5, 6, 7, 8, 7, 9]},
    {"district": "Pandesara Sector", "count": 38, "dominant_type": "Burglary", "lat": 21.110, "lng": 72.815, "trend": [3, 4, 6, 5, 7, 8, 8]},
    {"district": "Limbayat & Dindoli", "count": 31, "dominant_type": "Drug Offense", "lat": 21.185, "lng": 72.890, "trend": [2, 3, 4, 6, 5, 7, 6]},
]


@router.get("/zones", response_model=List[RiskZoneOut])
async def get_heatmap_zones() -> List[RiskZoneOut]:
    return [RiskZoneOut(**z) for z in MOCK_ZONES]


@router.get("/clusters", response_model=List[CrimeClusterOut])
async def get_heatmap_clusters() -> List[CrimeClusterOut]:
    return [CrimeClusterOut(**c) for c in MOCK_CLUSTERS]


@router.get("/points", response_model=List[HeatmapPointOut])
async def get_heatmap_points(
    days: int = Query(30, ge=1, le=365),
    crime_type: Optional[str] = Query(None),
) -> List[HeatmapPointOut]:
    points: List[HeatmapPointOut] = []
    crime_types = ["Theft", "Assault", "Cyber Fraud", "Drug Offense", "Robbery", "Murder", "Fraud", "Kidnapping"]
    zone_point_counts = [30, 45, 54, 58, 28, 72, 80, 20, 31, 41, 38, 15]

    seed = 54321

    def pseudo_random():
        nonlocal seed
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280.0

    for idx, zone in enumerate(MOCK_ZONES):
        count = zone_point_counts[idx] if idx < len(zone_point_counts) else 25
        for _ in range(count):
            r = pseudo_random() * 0.016
            theta = pseudo_random() * 2 * math.pi
            type_idx = int(pseudo_random() * len(crime_types))
            c_type = crime_types[type_idx]
            weight = int(pseudo_random() * 5) + 1

            if not crime_type or crime_type == "All" or c_type == crime_type:
                points.append(
                    HeatmapPointOut(
                        lat=round(zone["lat"] + r * math.cos(theta), 4),
                        lng=round(zone["lng"] + r * math.sin(theta), 4),
                        weight=weight,
                        type=c_type,
                    )
                )

    return points
