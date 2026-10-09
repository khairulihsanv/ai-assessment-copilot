import json
import os

reqs = [
    ("FR1", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR2", "7. Registry FR", "R0", "", "NOT_STARTED"),
    ("FR3", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR4", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR5", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR6a", "7. Registry FR", "R0", "", "NOT_STARTED"),
    ("FR6b", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR7a", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR7b", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR8", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR9", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR10", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR11", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR12", "7. Registry FR", "R1", "", "NOT_STARTED"),
    ("FR13", "7. Registry FR", "R0", "", "NOT_STARTED"),
    ("FR14", "7. Registry FR", "R0", "", "NOT_STARTED"),
    ("FR15", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR16", "7. Registry FR", "R1", "", "NOT_STARTED"),
    ("FR17", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR18", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR19", "7. Registry FR", "R1", "", "NOT_STARTED"),
    ("FR20", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR21", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR22", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR23", "7. Registry FR", "R2", "", "NOT_STARTED"),
    ("FR24", "7. Registry FR", "R2", "", "NOT_STARTED"),
]
for i in range(1, 23):
    id = f"DX{i:02d}"
    reqs.append((id, "8. Registry DX", "R1", "", "NOT_STARTED"))

for i in range(1, 14):
    id = f"EXT{i:02d}"
    reqs.append((id, "9. Komitmen tambahan", "R2/R3", "", "NOT_STARTED"))

for i in range(1, 17):
    id = f"NFR{i:02d}"
    reqs.append((id, "16. Persyaratan nonfungsional", "R2", "", "NOT_STARTED"))

lines = [
    "# Matriks Traceability Dexa Assessment",
    "",
    "| ID | Sumber/Bagian PRD | Fase | Lokasi Kode | Gap/Bukti | Acceptance/Test | Status | Blocker |",
    "|---|---|---|---|---|---|---|---|"
]
for r in reqs:
    id, sumber, fase, kode, status = r
    lines.append(f"| **{id}** | {sumber} | {fase} | {kode} | | `AT-{id}` | {status} | |")

with open(r"e:\Semester 3\Ai Assessment copilot\ai-assessment-copilot\docs\implementation\01-traceability.md", "w") as f:
    f.write("\n".join(lines))
