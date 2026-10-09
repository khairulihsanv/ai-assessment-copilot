// Unit tests never inherit a real application database URL.
process.env.DATABASE_URL = "postgresql://test_user:unused@127.0.0.1:1/dexa_test";
