import os

from dotenv import dotenv_values

_base_url = os.environ.get("DATABASE_URL") or dotenv_values(".env").get("DATABASE_URL", "")
assert _base_url, "DATABASE_URL is missing from backend/.env"

# Must be set BEFORE the app is imported, so everything uses the test database.
os.environ["DATABASE_URL"] = _base_url.rsplit("/", 1)[0] + "/buildspace_test"
os.environ["JWT_SECRET"] = "test-secret-only-used-in-automated-tests-0123456789"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["COOKIE_SECURE"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: E402,F401
from app.db.session import Base, engine  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    assert engine.url.database is not None and engine.url.database.endswith("_test")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client():
    with TestClient(fastapi_app) as test_client:
        yield test_client
