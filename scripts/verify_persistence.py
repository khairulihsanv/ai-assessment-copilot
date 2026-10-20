import time
import subprocess
import psycopg2

def verify_persistence():
    print("=== TESTING POSTGRESQL DATA PERSISTENCE ACROSS CONTAINER RESTARTS ===")

    # 1. Capture state before restart
    conn = psycopg2.connect("postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot")
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tables = sorted([t[0] for t in cur.fetchall()])
    counts_before = {}
    for t in tables:
        cur.execute(f'SELECT count(*) FROM "{t}"')
        counts_before[t] = cur.fetchone()[0]
    conn.close()
    print(f"1. Captured row counts across {len(tables)} tables before restart.")

    # 2. Restart container
    print("2. Restarting Docker container 'ai_assessment_db'...")
    subprocess.run(["docker", "restart", "ai_assessment_db"], check=True)
    print("   Container restart command issued. Waiting for healthcheck...")

    # Wait for container to be ready
    for i in range(30):
        time.sleep(1)
        res = subprocess.run(
            ["docker", "exec", "ai_assessment_db", "pg_isready", "-U", "postgres", "-d", "ai_assessment_copilot"],
            capture_output=True, text=True
        )
        if res.returncode == 0:
            print(f"   Database is ready after {i+1} seconds!")
            break

    # 3. Connect after restart and verify row counts
    conn = psycopg2.connect("postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot")
    cur = conn.cursor()
    print("\n3. Verifying post-restart row counts:")
    all_persistent = True
    for t in tables:
        cur.execute(f'SELECT count(*) FROM "{t}"')
        count_after = cur.fetchone()[0]
        count_before = counts_before[t]
        status = "PERSISTENT" if count_after == count_before else "LOST_DATA"
        print(f"   - {t:<30} Before: {count_before:<4} After: {count_after:<4} [{status}]")
        if count_after != count_before:
            all_persistent = False
    conn.close()

    assert all_persistent, "Data persistence check failed!"
    print("\n=== SUCCESS: DATA PERSISTENCE VERIFIED 100%! ===")

if __name__ == "__main__":
    verify_persistence()
