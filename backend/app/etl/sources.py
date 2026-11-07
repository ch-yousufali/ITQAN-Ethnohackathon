from dataclasses import dataclass


@dataclass(frozen=True)
class SourceSpec:
    name: str
    url: str
    license: str
    expected_files: list[str]
    notes: str
    tier_default: str = "measured"


SOURCES: dict[str, SourceSpec] = {
    "imppat": SourceSpec(
        name="IMPPAT_3.0",
        url="https://cb.imsc.res.in/imppat/download",
        license="CC BY 4.0 (verify on download page)",
        expected_files=["plants.csv", "phytochemicals.csv", "formulations.csv"],
        notes="Ayurvedic anchor tradition. Plant-synonym mapping + plant-compound links.",
    ),
    "tcmsp": SourceSpec(
        name="TCMSP",
        url="https://old.tcmsp-e.com/browse.php?qc=herbs",
        license="Academic use",
        expected_files=["herbs.xlsx", "ingredients.xlsx", "targets.xlsx"],
        notes="TCM anchor tradition. Excel exports of herbs, ingredients, targets.",
    ),
    "npass": SourceSpec(
        name="NPASS",
        url="http://bidd.group/NPASS/download.html",
        license="Academic use",
        expected_files=["npactivity.csv", "naturalproducts.csv"],
        notes="Gap-filling natural products across traditions.",
    ),
    "chembl": SourceSpec(
        name="ChEMBL",
        url="https://ftp.ebi.ac.uk/pub/databases/chembl/ChEMBLdb/latest/",
        license="CC BY-SA 3.0",
        expected_files=["chembl_XX_sqlite.tar.gz"],
        notes="Compound-target bioactivities. Prefer SQL dump over REST.",
    ),
    "stitch": SourceSpec(
        name="STITCH",
        url="http://stitch.embl.de/cgi/download.pl",
        license="CC BY 4.0 (academic)",
        expected_files=["9606.protein_chemical.links.v5.0.tsv.gz"],
        notes="Chemical-protein interaction network. Human slice only.",
    ),
}
