import pytest
from tests.conftest import assert_safe_test_db

def test_safety_guard_blocks_main_application_database():
    with pytest.raises(RuntimeError, match="SAFETY ABORT"):
        assert_safe_test_db("postgresql://postgres:password@localhost:5432/ai_assessment_copilot")

def test_safety_guard_blocks_non_test_database():
    with pytest.raises(RuntimeError, match="SAFETY ABORT"):
        assert_safe_test_db("postgresql://postgres:password@localhost:5432/production_db")

def test_safety_guard_blocks_empty_database_name():
    with pytest.raises(RuntimeError, match="SAFETY ABORT"):
        assert_safe_test_db("postgresql://postgres:password@localhost:5432/")

def test_safety_guard_allows_valid_test_database():
    # Should not raise any exception
    assert_safe_test_db("postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test")
