import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.analysis.engine import analyze_formulation
from app.api.deps import SessionDep
from app.api.v1.adapters import analysis_to_frontend
from app.db.session import SessionLocal
from app.models.analysis import AnalysisRun
from app.models.enums import AnalysisStatus
from app.models.formulation import Formulation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analyses"])


async def _run_analysis_bg(run_id: uuid.UUID) -> None:
    async with SessionLocal() as session:
        try:
            await analyze_formulation(session, run_id)
        except Exception:
            # The engine already marked the run FAILED; log so the cause isn't lost.
            logger.exception("Analysis run %s failed", run_id)


async def _trigger(formulation_id: uuid.UUID, session, background: BackgroundTasks):
    formulation = await session.get(Formulation, formulation_id)
    if formulation is None:
        raise HTTPException(status_code=404, detail="Formulation not found")
    run = AnalysisRun(formulation_id=formulation_id, status=AnalysisStatus.PENDING)
    session.add(run)
    await session.commit()
    await session.refresh(run)
    background.add_task(_run_analysis_bg, run.id)
    return await analysis_to_frontend(session, run)


@router.post("/formulations/{formulation_id}/analyses", status_code=202)
async def trigger_analysis_plural(
    formulation_id: uuid.UUID, session: SessionDep, background: BackgroundTasks
):
    return await _trigger(formulation_id, session, background)


@router.post("/formulations/{formulation_id}/analyze", status_code=202)
async def trigger_analysis_singular(
    formulation_id: uuid.UUID, session: SessionDep, background: BackgroundTasks
):
    return await _trigger(formulation_id, session, background)


@router.get("/analyses")
async def list_analyses(session: SessionDep, limit: int = 50):
    rows = (await session.execute(
        select(AnalysisRun).order_by(AnalysisRun.created_at.desc()).limit(limit)
    )).scalars().all()
    return [await analysis_to_frontend(session, r) for r in rows]


@router.get("/analyses/{run_id}")
async def get_analysis(run_id: uuid.UUID, session: SessionDep):
    run = await session.get(AnalysisRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    return await analysis_to_frontend(session, run)
