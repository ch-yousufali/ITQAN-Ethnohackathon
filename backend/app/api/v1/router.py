from fastapi import APIRouter

from app.api.v1 import analyses, compounds, findings, formulations, manuscripts, plants

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(formulations.router)
api_router.include_router(plants.router)
api_router.include_router(compounds.router)
api_router.include_router(analyses.router)
api_router.include_router(findings.router)
api_router.include_router(manuscripts.router)
