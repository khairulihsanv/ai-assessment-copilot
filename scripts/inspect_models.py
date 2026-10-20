import sys
from pathlib import Path
sys.path.insert(0, str(Path("apps/backend").resolve()))

from app.database import Base
import app.models.models

print("=== REGISTERED SQLALCHEMY TABLES ===")
for t_name, table in Base.metadata.tables.items():
    print(f"\nTable: {t_name}")
    for col in table.columns:
        print(f"  - {col.name}: {col.type} (nullable={col.nullable}, pk={col.primary_key})")
    for fk in table.foreign_keys:
        print(f"    FK -> {fk.target_fullname} (ondelete={fk.ondelete})")
    for idx in table.indexes:
        print(f"    INDEX: {idx.name} ({[c.name for c in idx.columns]})")
