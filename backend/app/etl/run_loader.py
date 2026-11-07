import argparse
import asyncio
import sys
from pathlib import Path

from app.db.session import SessionLocal
from app.etl.imppat_plants_loader import ImppatPlantsLoader
from app.etl.imppat_compounds_loader import ImppatCompoundsLoader
from app.etl.imppat_formulations_loader import ImppatFormulationsLoader
from app.etl.imppat_associations_loader import ImppatAssociationsLoader
from app.etl.imppat_targets_loader import ImppatTargetsLoader
from app.etl.imppat_bioactivity_loader import ImppatBioactivityLoader

LOADERS = {
    "imppat_plants": ImppatPlantsLoader,
    "imppat_compounds": ImppatCompoundsLoader,
    "imppat_formulations": ImppatFormulationsLoader,
    "imppat_associations": ImppatAssociationsLoader,
    "imppat_targets": ImppatTargetsLoader,
    "imppat_bioactivity": ImppatBioactivityLoader,
}


async def run(source: str, path: Path) -> int:
    cls = LOADERS.get(source)
    if cls is None:
        print(f"unknown source '{source}'. Available: {list(LOADERS)}", file=sys.stderr)
        return 2
    loader = cls()
    async with SessionLocal() as session:
        try:
            result = await loader.load(session, path)
        except Exception as exc:
            print(f"FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
            return 1
    if result.ok:
        print(f"OK: loaded {result.inserted} rows from {loader.source_name}")
        for k, v in result.manifest.notes.items():
            print(f"  {k}: {v}")
        return 0
    print(f"FAILED: {result.errors}", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", choices=list(LOADERS))
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    return asyncio.run(run(args.source, args.path))


if __name__ == "__main__":
    sys.exit(main())
