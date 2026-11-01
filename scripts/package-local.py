"""Package only user-facing local files; no repository, drafts, or specifications."""
import argparse
import hashlib
from pathlib import Path
import zipfile


root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description="Package the built local Zhitie release")
parser.add_argument("--source", type=Path, default=root / "local-output")
parser.add_argument("--output", type=Path, default=root.parent / "Житие — локальный выпуск.zip")
args = parser.parse_args()
names = (
    "Начните здесь.html", "Житие.html", "methodology.html", "verified-data.csv",
    "sector-wages.json", "Прочитайте меня.txt", "media-credits.html",
    "fonts-prata-license.txt", "fonts-manrope-license.txt",
    "additional-context.html", "additional-data.json",
)
payloads = {name: (args.source / name).read_bytes() for name in names}
checksums = "\n".join(
    f"{hashlib.sha256(content).hexdigest()}  {name}" for name, content in payloads.items()
) + "\n"
payloads["Контрольные суммы SHA256.txt"] = checksums.encode("utf-8")
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for name, content in payloads.items():
        info = zipfile.ZipInfo("Житие/" + name, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, content)
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None, "Archive integrity check failed"
    assert len(archive.namelist()) == len(payloads), "Unexpected archive members"
    for name, content in payloads.items():
        assert archive.read("Житие/" + name) == content, name
print(f"Local release: {args.output} ({args.output.stat().st_size} bytes, {len(payloads)} files)")
