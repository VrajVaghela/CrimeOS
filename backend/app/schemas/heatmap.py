from __future__ import annotations

from typing import List
from pydantic import BaseModel


class HeatmapPointOut(BaseModel):
    lat: float
    lng: float
    weight: int
    type: str


class RiskZoneOut(BaseModel):
    name: str
    lat: float
    lng: float
    risk_score: float
    level: str
    boundary: List[List[float]]


class CrimeClusterOut(BaseModel):
    district: str
    count: int
    dominant_type: str
    lat: float
    lng: float
    trend: List[int]
