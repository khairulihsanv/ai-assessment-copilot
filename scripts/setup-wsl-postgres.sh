#!/usr/bin/env bash
set -e

# Idempotent WSL PostgreSQL setup for Dexa Assessment isolated test database
# Conforms to strict security & isolation standards:
# - Non-superuser runtime role (test_user)
# - No 0.0.0.0/0 rules in pg_hba.conf
# - Specific test_db / test_user access only
# - Preserves postgres admin password

PG_CONF="/etc/postgresql/18/main/postgresql.conf"
PG_HBA="/etc/postgresql/18/main/pg_hba.conf"

# 1. Configure listener strictly for localhost and specific WSL virtual interface IP (never *)
if [ -f "$PG_CONF" ]; then
    WSL_IP=$(hostname -I | awk '{print $1}')
    if [ -n "$WSL_IP" ]; then
        sed -i "s|^[# ]*listen_addresses\s*=.*|listen_addresses = 'localhost,$WSL_IP'|g" "$PG_CONF"
    else
        sed -i "s|^[# ]*listen_addresses\s*=.*|listen_addresses = 'localhost'|g" "$PG_CONF"
    fi
fi

# 2. Configure pg_hba.conf: restrict to test_db and test_user from exact host IP only (/32)
if [ -f "$PG_HBA" ]; then
    # Clean up broad or malformed rules from previous runs
    sed -i "/host all all 0.0.0.0\/0/d" "$PG_HBA"
    sed -i "/host.*test_db.*test_user.*172\.16\.0\.0\/12/d" "$PG_HBA"
    sed -i "/# DEXA_TEST_ISOLATION_RULES/,/# END_DEXA_TEST_ISOLATION_RULES/d" "$PG_HBA"
    
    # Identify exact Windows gateway IP from routing table (source address of incoming Windows connections)
    HOST_GW_IP=$(ip route | awk '/default/ {print $3}')
    
    echo "# DEXA_TEST_ISOLATION_RULES" >> "$PG_HBA"
    echo "host    test_db         test_user       127.0.0.1/32            scram-sha-256" >> "$PG_HBA"
    if [ -n "$HOST_GW_IP" ]; then
        echo "host    test_db         test_user       ${HOST_GW_IP}/32         scram-sha-256" >> "$PG_HBA"
    fi
    echo "# END_DEXA_TEST_ISOLATION_RULES" >> "$PG_HBA"
fi

# 3. Restart PostgreSQL service to apply listener and auth changes
if command -v systemctl >/dev/null 2>&1; then
    systemctl restart postgresql || service postgresql restart
else
    service postgresql restart
fi

# 4. Create non-superuser test_user (without SUPERUSER)
sudo -u postgres psql -c "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'test_user') THEN
        CREATE ROLE test_user WITH LOGIN PASSWORD 'test_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE test_user WITH LOGIN PASSWORD 'test_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
\$\$;"

# 5. Create isolated test_db owned by test_user
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw test_db; then
    sudo -u postgres createdb -O test_user test_db
else
    sudo -u postgres psql -c "ALTER DATABASE test_db OWNER TO test_user;"
fi

# 6. Provision extensions as postgres superuser, grant usage to test_user
sudo -u postgres psql -d test_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -d test_db -c "GRANT ALL ON SCHEMA public TO test_user;"

echo "[setup-wsl-postgres] Hardened & isolated test database setup completed successfully."
