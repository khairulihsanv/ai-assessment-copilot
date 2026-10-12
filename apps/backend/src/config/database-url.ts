// Intentionally restrict the destructive-test target to a local disposable DB.
// Remote test infrastructure requires a separately reviewed configuration.
export function requireTestDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("TEST_DATABASE_URL wajib diisi untuk tes integrasi.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL tidak valid.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname) ||
    !["/test_db", "/dexa_test"].includes(url.pathname) ||
    url.username !== "test_user" ||
    [...url.searchParams.keys()].some((key) => !["schema", "sslmode"].includes(key)) ||
    (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public")
  ) {
    throw new Error("Database tes harus PostgreSQL lokal test_db/dexa_test milik test_user.");
  }
  return value;
}
