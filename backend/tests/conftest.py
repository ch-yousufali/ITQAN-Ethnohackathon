"""Integration tests against a running API and its database.

Run inside the API container (it mounts this directory at /code):

    docker compose exec api pip install pytest      # once per container
    docker compose exec api pytest -q

They need the IMPPAT data loaded and at least one completed analysis with findings.
Every row a test creates is deleted again afterwards.
"""
import os
import uuid

import httpx
import psycopg
import pytest

API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1").rstrip("/")
DB_URL = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")

TEST_PREFIX = "ZZ pytest"


@pytest.fixture(scope="session")
def api():
    with httpx.Client(base_url=API_URL, timeout=60) as client:
        try:
            client.get("/analyses").raise_for_status()
        except httpx.HTTPError as exc:
            pytest.exit(f"API not reachable at {API_URL}: {exc}")
        yield client


@pytest.fixture(scope="session")
def db():
    with psycopg.connect(DB_URL, autocommit=True) as conn:
        yield conn


@pytest.fixture(scope="session")
def completed_run(api):
    """The newest completed analysis that produced findings."""
    runs = [a for a in api.get("/analyses").json()
            if a["status"] == "completed" and a["findings_count"] > 0]
    if not runs:
        pytest.skip("No completed analysis with findings; run one in the app first.")
    return runs[0]


@pytest.fixture(scope="session")
def mapped_ingredients(api, completed_run):
    """Ingredient inputs from a formulation known to produce findings."""
    f = api.get(f"/formulations/{completed_run['formulation_id']}").json()
    ings = [
        {"traditional_name": i["traditional_name"], "plant_id": i["plant_id"],
         "part_used": i["part_used"], "quantity": i["quantity"]}
        for i in f["ingredients"]
    ]
    if len({i["plant_id"] for i in ings if i["plant_id"]}) < 2:
        pytest.skip("Reference formulation has fewer than 2 mapped plants.")
    return ings


@pytest.fixture
def make_formulation(api):
    created: list[str] = []

    def _make(ingredients, name=None):
        res = api.post("/formulations", json={
            "name": name or f"{TEST_PREFIX} {uuid.uuid4().hex[:6]}",
            "tradition": "Ayurveda", "period": "", "description": None,
            "source_note": None, "ingredients": ingredients,
        })
        assert res.status_code == 201, res.text
        created.append(res.json()["id"])
        return res.json()

    yield _make
    for fid in created:
        api.delete(f"/formulations/{fid}")


@pytest.fixture
def make_manuscript(db):
    """Insert a manuscript row directly, bypassing upload + OCR (no external calls)."""
    created: list[uuid.UUID] = []

    def _make(status="review", ingredients=()):
        mid = uuid.uuid4()
        db.execute(
            "insert into manuscripts (id, filename, content_type, file_path, status, uploaded_at)"
            " values (%s, %s, 'image/png', '/nonexistent.png', %s, now())",
            (mid, f"{TEST_PREFIX}.png", status),
        )
        for idx, (name, ing_status, plant_id) in enumerate(ingredients):
            db.execute(
                "insert into manuscript_ingredients (id, manuscript_id, traditional_name, plant_id,"
                " status, candidates, order_index) values (%s, %s, %s, %s, %s, '[]', %s)",
                (uuid.uuid4(), mid, name, plant_id, ing_status, idx),
            )
        created.append(mid)
        return str(mid)

    yield _make
    for mid in created:
        row = db.execute("select formulation_id from manuscripts where id = %s", (mid,)).fetchone()
        db.execute("delete from manuscripts where id = %s", (mid,))
        if row and row[0]:
            db.execute("delete from formulations where id = %s", (row[0],))
