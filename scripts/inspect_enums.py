import psycopg2

conn = psycopg2.connect("postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot")
cur = conn.cursor()

cur.execute("""
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder;
""")
enums = {}
for typname, enumlabel in cur.fetchall():
    enums.setdefault(typname, []).append(enumlabel)

print("=== POSTGRES ENUMS ===")
for name, labels in enums.items():
    print(f"{name}: {labels}")

conn.close()
