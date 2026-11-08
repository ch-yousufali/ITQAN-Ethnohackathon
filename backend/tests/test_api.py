import time
import uuid

import pytest


def wait_for_run(api, run_id, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        run = api.get(f"/analyses/{run_id}").json()
        if run["status"] in ("completed", "failed"):
            return run
        time.sleep(0.5)
    pytest.fail(f"Analysis {run_id} did not finish within {timeout}s")


# ---------- Errors ----------

def test_errors_carry_message_for_the_frontend(api):
    res = api.get(f"/plants/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["message"] == "Plant not found"

    res = api.get("/plants/not-a-uuid")
    assert res.status_code == 422
    assert isinstance(res.json()["message"], str)

    res = api.post("/formulations", json={"name": "", "tradition": "x", "ingredients": []})
    assert res.status_code == 422
    assert "name" in res.json()["message"]


# ---------- Plants ----------

def test_plant_list_is_fast_and_compounds_unique(api):
    start = time.time()
    res = api.get("/plants", headers={"Accept-Encoding": "gzip"})
    elapsed = time.time() - start
    assert res.status_code == 200
    assert res.headers.get("content-encoding") == "gzip"
    assert elapsed < 10, f"/plants took {elapsed:.1f}s (was 24s before the bulk-load fix)"

    plants = res.json()
    assert plants, "no plants loaded"
    for p in plants:
        ids = [c["id"] for c in p["compounds"]]
        assert len(ids) == len(set(ids)), f"duplicate compounds on {p['botanical_name']}"


def test_plant_detail_matches_list_entry(api):
    plants = api.get("/plants").json()
    p = next(x for x in plants if x["compounds"])
    detail = api.get(f"/plants/{p['id']}").json()
    assert detail["compounds"] == p["compounds"]
    assert detail["parts_used"] == p["parts_used"]


# ---------- Formulations ----------

def test_put_returns_the_new_ingredients(api, make_formulation, mapped_ingredients):
    f = make_formulation(mapped_ingredients[:1])
    body = {"name": f["name"] + " v2", "tradition": "Ayurveda", "period": "",
            "description": None, "source_note": None, "ingredients": mapped_ingredients}
    res = api.put(f"/formulations/{f['id']}", json=body)
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"].endswith(" v2")
    assert [i["traditional_name"] for i in updated["ingredients"]] == \
        [i["traditional_name"] for i in mapped_ingredients]
    # And the stored copy agrees with what PUT returned.
    assert api.get(f"/formulations/{f['id']}").json()["ingredients"] == updated["ingredients"]


def test_delete_formulation_removes_its_analyses(api, make_formulation, mapped_ingredients):
    f = make_formulation(mapped_ingredients)
    run = api.post(f"/formulations/{f['id']}/analyses").json()
    wait_for_run(api, run["id"])
    assert api.delete(f"/formulations/{f['id']}").status_code == 204
    assert api.get(f"/formulations/{f['id']}").status_code == 404
    assert api.get(f"/analyses/{run['id']}").status_code == 404


# ---------- Analyses ----------

def test_queued_analysis_has_no_coverage_and_completed_one_does(
    api, make_formulation, mapped_ingredients
):
    f = make_formulation(mapped_ingredients)
    res = api.post(f"/formulations/{f['id']}/analyses")
    assert res.status_code == 202
    queued = res.json()
    assert queued["status"] == "queued"
    assert queued["coverage"] is None

    run = wait_for_run(api, queued["id"])
    assert run["status"] == "completed", run["error"]
    cov = run["coverage"]
    assert cov is not None
    assert 0 <= cov["ratio"] <= 1
    assert cov["compounds_total"] > 0
    assert 0 < cov["compounds_with_targets"] <= cov["compounds_total"]
    assert cov["ingredients_total"] == len(mapped_ingredients)
    assert run["findings_count"] > 0


def test_single_plant_analysis_explains_why_no_findings(api, make_formulation, mapped_ingredients):
    one = next(i for i in mapped_ingredients if i["plant_id"])
    f = make_formulation([one])
    run = wait_for_run(api, api.post(f"/formulations/{f['id']}/analyses").json()["id"])
    assert run["status"] == "completed"
    assert run["findings_count"] == 0
    warnings = " ".join(run["coverage"]["warnings"])
    assert "at least 2" in warnings
    assert "No ingredients could be resolved" not in warnings


# ---------- Findings ----------

def test_finding_detail_rank_matches_list(api, completed_run):
    findings = api.get(f"/analyses/{completed_run['id']}/findings").json()
    assert [f["rank"] for f in findings] == list(range(1, len(findings) + 1))
    scores = [f["score"] for f in findings]
    assert scores == sorted(scores, reverse=True)
    for idx in {0, 1, len(findings) // 2, len(findings) - 1}:
        detail = api.get(f"/findings/{findings[idx]['id']}").json()
        assert detail["rank"] == findings[idx]["rank"]


def test_findings_list_order_is_stable(api, completed_run):
    url = f"/analyses/{completed_run['id']}/findings"
    assert [f["id"] for f in api.get(url).json()] == [f["id"] for f in api.get(url).json()]


# ---------- Graph ----------

@pytest.mark.parametrize("scoped", [True, False])
def test_graph_is_consistent(api, completed_run, scoped):
    url = f"/graph?analysis_id={completed_run['id']}" if scoped else "/graph"
    res = api.get(url)
    assert res.status_code == 200
    g = res.json()
    node_ids = [n["id"] for n in g["nodes"]]
    assert len(node_ids) == len(set(node_ids))
    types = {n["type"] for n in g["nodes"]}
    assert {"formulation", "plant", "compound", "target"} <= types
    ids = set(node_ids)
    for link in g["links"]:
        assert link["source"] in ids and link["target"] in ids, link
        if link["category"] is not None:
            assert link["sources"], f"evidence link without a source: {link['id']}"
    for n in g["nodes"]:
        if n["type"] in ("plant", "compound", "formulation"):
            assert n["href"] and n["href"].startswith("/")


def test_graph_unknown_analysis_is_404(api):
    assert api.get(f"/graph?analysis_id={uuid.uuid4()}").status_code == 404


# ---------- Manuscripts ----------

def test_confirm_rejected_while_uncertain(api, make_manuscript, mapped_ingredients):
    pid = mapped_ingredients[0]["plant_id"]
    mid = make_manuscript(ingredients=[("Pippali", "uncertain", pid), ("Shunthi", "confirmed", pid)])
    res = api.post(f"/manuscripts/{mid}/confirm", json={"name": "ZZ pytest ms"})
    assert res.status_code == 409
    assert "Pippali" in res.json()["message"]


def test_confirm_creates_formulation_linked_back(api, make_manuscript, mapped_ingredients):
    pid = mapped_ingredients[0]["plant_id"]
    mid = make_manuscript(ingredients=[("Shunthi", "confirmed", pid)])
    res = api.post(f"/manuscripts/{mid}/confirm", json={"name": "ZZ pytest ms"})
    assert res.status_code == 200, res.text
    formulation = res.json()
    assert formulation["manuscript_id"] == mid
    assert formulation["ingredients"][0]["plant_id"] == pid

    again = api.post(f"/manuscripts/{mid}/confirm", json={"name": "ZZ pytest ms"})
    assert again.status_code == 409


def test_confirm_rejected_while_processing(api, make_manuscript):
    mid = make_manuscript(status="processing")
    assert api.post(f"/manuscripts/{mid}/confirm", json={"name": "x"}).status_code == 409


def test_patch_validates_plant_and_status(api, make_manuscript):
    mid = make_manuscript(ingredients=[("Pippali", "unmapped", None)])
    ing_id = api.get(f"/manuscripts/{mid}").json()["ingredients"][0]["id"]

    res = api.patch(f"/manuscripts/{mid}", json={"ingredients": [{"id": ing_id, "plant_id": "nope"}]})
    assert res.status_code == 422
    res = api.patch(f"/manuscripts/{mid}",
                    json={"ingredients": [{"id": ing_id, "plant_id": str(uuid.uuid4())}]})
    assert res.status_code == 422
    res = api.patch(f"/manuscripts/{mid}", json={"ingredients": [{"id": ing_id, "status": "bogus"}]})
    assert res.status_code == 422


def test_patch_returns_updated_manuscript(api, make_manuscript, mapped_ingredients):
    pid = mapped_ingredients[0]["plant_id"]
    mid = make_manuscript(ingredients=[("Pippali", "unmapped", None)])
    ing_id = api.get(f"/manuscripts/{mid}").json()["ingredients"][0]["id"]
    res = api.patch(f"/manuscripts/{mid}", json={
        "ocr_text": "edited", "ingredients": [{"id": ing_id, "plant_id": pid, "status": "corrected"}],
    })
    assert res.status_code == 200
    body = res.json()
    assert body["ocr_text"] == "edited"
    assert body["ingredients"][0]["plant_id"] == pid
    assert body["ingredients"][0]["botanical_name"]
    assert body["ingredients"][0]["status"] == "corrected"


def test_ocr_failure_marks_manuscript_failed(make_manuscript, monkeypatch, db):
    """A DB error mid-OCR used to leave the manuscript 'processing' forever."""
    import asyncio

    from app.api.v1 import manuscripts as ms
    from app.manuscripts import ingredient_extractor

    async def fake_extract(_path):
        return {"text": "Pippali", "confidence": 0.9, "model": "test", "error": None}

    async def fake_resolve(_session, _name):
        # A plant_id that does not exist -> FK violation on commit.
        return [{"plant_id": str(uuid.uuid4()), "botanical_name": "Nope", "confidence": 0.95}]

    monkeypatch.setattr(ms, "extract_manuscript", fake_extract)
    monkeypatch.setattr(ms, "resolve_ingredient_name", fake_resolve)
    monkeypatch.setattr(ingredient_extractor, "extract_ingredients",
                        lambda _t: [{"traditional_name": "Pippali", "confidence": 0.9}])

    mid = make_manuscript(status="processing")

    async def run():
        try:
            await ms._process_ocr(uuid.UUID(mid))
        finally:
            from app.db.session import engine
            await engine.dispose()

    asyncio.run(run())
    status, error = db.execute(
        "select status, error from manuscripts where id = %s", (mid,)
    ).fetchone()
    assert status == "failed"
    assert "IntegrityError" in error
