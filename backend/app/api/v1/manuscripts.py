import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.db.session import SessionLocal
from app.manuscripts.ocr_adapter import extract_manuscript
from app.manuscripts.resolver import resolve_ingredient_name
from app.models.enums import ResolutionStatus, Tradition
from app.models.formulation import Formulation, FormulationIngredient
from app.models.manuscript import Manuscript, ManuscriptIngredient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/manuscripts", tags=["manuscripts"])

VALID_ING_STATUSES = {"confirmed", "corrected", "uncertain", "unmapped"}

MANUSCRIPTS_DIR = Path("/code/data/manuscripts")
MANUSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/png", "image/jpeg", "image/tiff", "image/webp", "application/pdf"
}
EXT_BY_TYPE = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/tiff": ".tif",
    "image/webp": ".webp", "application/pdf": ".pdf",
}


class ManuscriptPatch(BaseModel):
    ocr_text: str | None = None
    ingredients: list[dict] | None = None


class ConfirmInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    tradition: str = "ayurveda"
    period: str = ""


def _tradition(raw: str) -> Tradition:
    try:
        return Tradition(raw.lower())
    except ValueError:
        return Tradition.OTHER


def _ms_to_frontend(m: Manuscript) -> dict:
    return {
        "id": str(m.id),
        "filename": m.filename,
        "content_type": m.content_type,
        "preview_url": f"/api/v1/manuscripts/{m.id}/preview",
        "status": m.status,
        "error": m.error,
        "uploaded_at": m.uploaded_at.isoformat(),
        "ocr_text": m.ocr_text,
        "ocr_confidence": m.ocr_confidence,
        "ingredients": [
            {
                "id": str(i.id),
                "traditional_name": i.traditional_name,
                "plant_id": str(i.plant_id) if i.plant_id else None,
                "botanical_name": i.botanical_name,
                "confidence": i.confidence,
                "status": i.status,
                "rationale": i.rationale,
                "candidates": i.candidates or [],
            }
            for i in m.ingredients
        ],
        "formulation_id": str(m.formulation_id) if m.formulation_id else None,
    }


async def _get_ms(session, mid: uuid.UUID) -> Manuscript | None:
    result = await session.execute(
        select(Manuscript).where(Manuscript.id == mid).options(selectinload(Manuscript.ingredients))
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def _process_ocr(manuscript_id: uuid.UUID) -> None:
    async with SessionLocal() as session:
        m = await _get_ms(session, manuscript_id)
        if not m:
            return
        try:
            result = await extract_manuscript(Path(m.file_path))
            m.ocr_text = result["text"] or ""
            m.ocr_confidence = float(result.get("confidence") or 0.0)
            m.ocr_model = result.get("model") or "unknown"
            m.status = "review"
            if result.get("error"):
                m.error = result["error"]

            # Extract candidate ingredient names from lines (very simple heuristic
            # until the OCR guy returns structured ingredient names)
            if result["text"]:
                from app.manuscripts.ingredient_extractor import extract_ingredients
                try:
                    extracted = extract_ingredients(result["text"])
                except Exception:
                    extracted = []
                # fallback: if LLM found nothing, use line-by-line
                if not extracted:
                    for line in result["text"].splitlines():
                        t = line.strip()[:255]
                        if t:
                            extracted.append({"traditional_name": t, "confidence": 0.3})
                seen: set[str] = set()
                idx = 0
                for item in extracted:
                    name = item["traditional_name"][:255]
                    if not name or name.lower() in seen:
                        continue
                    seen.add(name.lower())
                    candidates = await resolve_ingredient_name(session, name)
                    best = candidates[0] if candidates else None
                    status = "confirmed" if best and best["confidence"] >= 0.9 else (
                        "uncertain" if best else "unmapped"
                    )
                    session.add(ManuscriptIngredient(
                        manuscript_id=m.id,
                        traditional_name=name,
                        plant_id=uuid.UUID(best["plant_id"]) if best else None,
                        botanical_name=best["botanical_name"] if best else None,
                        confidence=best["confidence"] if best else None,
                        status=status,
                        candidates=candidates,
                        order_index=idx,
                    ))
                    idx += 1
            await session.commit()
        except Exception as exc:
            # A failed flush leaves the session unusable; without the rollback this
            # commit raised too and the manuscript stayed "processing" forever,
            # so the UI kept polling.
            logger.exception("OCR processing failed for manuscript %s", manuscript_id)
            await session.rollback()
            m = await _get_ms(session, manuscript_id)
            if m is None:
                return
            m.status = "failed"
            m.error = f"{type(exc).__name__}: {str(exc)[:500]}"
            await session.commit()


@router.post("", status_code=201)
async def upload_manuscript(
    session: SessionDep, background: BackgroundTasks, file: UploadFile = File(...)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    ext = EXT_BY_TYPE[file.content_type]
    m_id = uuid.uuid4()
    path = MANUSCRIPTS_DIR / f"{m_id}{ext}"
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 25 MB limit")
    path.write_bytes(data)

    m = Manuscript(
        id=m_id, filename=file.filename or "upload",
        content_type=file.content_type, file_path=str(path),
        status="processing",
    )
    session.add(m)
    await session.commit()
    m = await _get_ms(session, m_id)
    background.add_task(_process_ocr, m_id)
    return _ms_to_frontend(m)


@router.get("")
async def list_manuscripts(session: SessionDep):
    rows = (await session.execute(
        select(Manuscript).options(selectinload(Manuscript.ingredients)).order_by(Manuscript.uploaded_at.desc())
    )).scalars().unique().all()
    return [_ms_to_frontend(m) for m in rows]


@router.get("/{manuscript_id}")
async def get_manuscript(manuscript_id: uuid.UUID, session: SessionDep):
    m = await _get_ms(session, manuscript_id)
    if not m:
        raise HTTPException(404, "Manuscript not found")
    return _ms_to_frontend(m)


@router.get("/{manuscript_id}/preview")
async def preview_manuscript(manuscript_id: uuid.UUID, session: SessionDep):
    m = await _get_ms(session, manuscript_id)
    if not m or not Path(m.file_path).exists():
        raise HTTPException(404, "File not found")
    return FileResponse(m.file_path, media_type=m.content_type, filename=m.filename)


@router.patch("/{manuscript_id}")
async def patch_manuscript(manuscript_id: uuid.UUID, payload: ManuscriptPatch, session: SessionDep):
    m = await _get_ms(session, manuscript_id)
    if not m:
        raise HTTPException(404, "Manuscript not found")

    if payload.ocr_text is not None:
        m.ocr_text = payload.ocr_text

    if payload.ingredients:
        by_id = {str(i.id): i for i in m.ingredients}
        for patch in payload.ingredients:
            ing_id = patch.get("id")
            ing = by_id.get(ing_id)
            if not ing:
                continue
            if "plant_id" in patch:
                pid = patch["plant_id"]
                if pid:
                    from app.models.plant import Plant
                    try:
                        plant_uuid = uuid.UUID(str(pid))
                    except ValueError:
                        raise HTTPException(422, f"Invalid plant_id: {pid}")
                    plant = await session.get(Plant, plant_uuid)
                    if plant is None:
                        raise HTTPException(422, "Selected plant does not exist")
                    ing.plant_id = plant.id
                    ing.botanical_name = plant.canonical_name if plant else None
                else:
                    ing.plant_id = None
                    ing.botanical_name = None
            if "status" in patch:
                if patch["status"] not in VALID_ING_STATUSES:
                    raise HTTPException(422, f"Invalid status: {patch['status']}")
                ing.status = patch["status"]
            if "traditional_name" in patch:
                ing.traditional_name = patch["traditional_name"]

    await session.commit()
    m = await _get_ms(session, manuscript_id)
    return _ms_to_frontend(m)


@router.post("/{manuscript_id}/confirm")
async def confirm_manuscript(manuscript_id: uuid.UUID, payload: ConfirmInput, session: SessionDep):
    m = await _get_ms(session, manuscript_id)
    if not m:
        raise HTTPException(404, "Manuscript not found")
    if m.status == "confirmed" and m.formulation_id:
        raise HTTPException(409, "This manuscript has already been confirmed.")
    if m.status != "review":
        raise HTTPException(409, "The manuscript is not ready for confirmation yet.")
    uncertain = [i.traditional_name for i in m.ingredients if i.status == "uncertain"]
    if uncertain:
        # API contract: reject confirmation while uncertain identifications remain.
        raise HTTPException(
            409, f"Resolve the uncertain ingredients first: {', '.join(uncertain[:5])}"
        )

    formulation = Formulation(
        name=payload.name,
        tradition=_tradition(payload.tradition),
        era=payload.period or None,
        source_text=f"From manuscript: {m.filename}",
        ingredients=[
            FormulationIngredient(
                raw_name=ing.traditional_name,
                plant_id=ing.plant_id,
                resolution_status=(
                    ResolutionStatus.RESOLVED if ing.plant_id else ResolutionStatus.UNRESOLVED
                ),
                order_index=idx,
            )
            for idx, ing in enumerate(m.ingredients)
        ],
    )
    session.add(formulation)
    await session.flush()

    m.formulation_id = formulation.id
    m.status = "confirmed"
    await session.commit()

    # Return the formulation in the frontend's shape
    from app.api.v1.adapters import formulation_to_frontend
    from sqlalchemy.orm import selectinload as sl
    loaded = (await session.execute(
        select(Formulation).where(Formulation.id == formulation.id).options(sl(Formulation.ingredients))
    )).scalar_one()
    return await formulation_to_frontend(session, loaded)
