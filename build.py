"""Build an XPI using Python's standard library."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text())
out = root / "dist" / f"reference-marker-fix-{manifest['version']}.xpi"
out.parent.mkdir(exist_ok=True)
with ZipFile(out, "w", ZIP_DEFLATED) as archive:
    for name in ("manifest.json", "bootstrap.js", "COPYING"):
        archive.write(root / name, name)
print(out)
