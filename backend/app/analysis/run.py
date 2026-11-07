import argparse
import asyncio
import sys

from sqlalchemy import select

from app.analysis.engine import analyze_formulation
from app.db.session import SessionLocal
from app.models.analysis import AnalysisRun
from app.models.enums import AnalysisStatus
from app.models.formulation import Formulation


async def run(formulation_id: str | None, formulation_name: str | None) -> int:
    async with SessionLocal() as session:
        if formulation_id:
            result = await session.execute(
                select(Formulation).where(Formulation.id == formulation_id)
            )
        elif formulation_name:
            result = await session.execute(
                select(Formulation).where(Formulation.name.ilike(f"%{formulation_name}%"))
            )
        else:
            result = await session.execute(
                select(Formulation).order_by(Formulation.id).limit(1)
            )
        formulation = result.scalars().first()
        if not formulation:
            print("formulation not found", file=sys.stderr)
            return 1

        run_obj = AnalysisRun(formulation_id=formulation.id, status=AnalysisStatus.PENDING)
        session.add(run_obj)
        await session.commit()
        await session.refresh(run_obj)

        print(f"Running analysis on: {formulation.name} (id={formulation.id})")
        print(f"Analysis run id: {run_obj.id}")
        try:
            result = await analyze_formulation(session, run_obj.id)
        except Exception as exc:
            print(f"FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
            return 2
        print(f"Result: {result}")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", dest="formulation_id", default=None)
    parser.add_argument("--name", dest="formulation_name", default=None)
    args = parser.parse_args()
    return asyncio.run(run(args.formulation_id, args.formulation_name))


if __name__ == "__main__":
    sys.exit(main())
