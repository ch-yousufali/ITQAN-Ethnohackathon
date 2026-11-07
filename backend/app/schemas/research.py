import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# ---- Plants ----

class PlantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    canonical_name: str
    family: str | None
    genus: str | None
    species: str | None
    system_of_medicine: str | None
    iucn_status: str | None


class PlantCompoundEdgeRead(BaseModel):
    compound_id: uuid.UUID
    compound_name: str
    inchikey: str | None
    pubchem_cid: int | None
    plant_part: str | None
    evidence_tier: str
    source: str


class PlantCompoundsResponse(BaseModel):
    plant_id: uuid.UUID
    canonical_name: str
    compound_count: int
    compounds: list[PlantCompoundEdgeRead]


# ---- Analyses ----

class AnalysisRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    formulation_id: uuid.UUID
    status: str
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    params: dict[str, Any]
    error: str | None


class AnalysisTriggerResponse(BaseModel):
    run_id: uuid.UUID
    status: str
    message: str


# ---- Findings ----

class FindingCompoundRef(BaseModel):
    id: uuid.UUID
    name: str
    inchikey: str | None
    pubchem_cid: int | None
    plant_id: uuid.UUID | None
    plant_name: str | None
    plant_part: str | None
    activity_nM: float | None


class FindingTargetRef(BaseModel):
    id: uuid.UUID
    name: str
    gene_symbol: str | None
    uniprot_id: str | None


class FindingRead(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    type: str
    score: float
    evidence_tier: str
    compound_a: FindingCompoundRef
    compound_b: FindingCompoundRef
    target: FindingTargetRef
    shared_target_count: int
    llm_interpretation: dict[str, Any] | None


class FindingsPage(BaseModel):
    items: list[FindingRead]
    total: int
    page: int
    page_size: int
