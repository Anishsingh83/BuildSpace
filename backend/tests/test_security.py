import logging

import pytest

from app.core.config import Settings
from app.core.limiter import limiter
from app.core.logging_config import RedactingFormatter, redact

PROJECTS = "/api/v1/projects"
JSON = {"Content-Type": "application/json"}


def auth(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_security_headers_on_api_responses(client):
    response = client.get("/api/v1/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "default-src 'none'" in response.headers["content-security-policy"]
    assert "strict-transport-security" not in response.headers  # development mode


def test_docs_page_is_not_blocked_by_the_api_csp(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "content-security-policy" not in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"


def test_auth_responses_are_not_cached(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "correct-horse-battery"},
    )
    assert response.headers["cache-control"] == "no-store"


def test_oversized_body_is_rejected(client):
    response = client.post("/api/v1/auth/login", content=b"x" * (70 * 1024), headers=JSON)
    assert response.status_code == 413
    assert client.get("/api/v1/health").status_code == 200


def test_oversized_streamed_body_is_rejected(client):
    def chunks():
        for _ in range(100):
            yield b"x" * 1024

    response = client.post("/api/v1/auth/login", content=chunks(), headers=JSON)
    assert response.status_code == 413


def test_file_saves_get_a_larger_limit_but_validation_still_applies(client):
    h = auth(client)
    pid = client.post(PROJECTS, json={"title": "P"}, headers=h).json()["id"]
    url = f"{PROJECTS}/{pid}/files"
    huge = client.put(url, json={"files": [{"path": "a.txt", "content": "a" * (6 * 1024 * 1024)}]}, headers=h)
    assert huge.status_code == 413
    too_big_file = client.put(url, json={"files": [{"path": "a.txt", "content": "a" * (600 * 1024)}]}, headers=h)
    assert too_big_file.status_code == 422
    fine = client.put(url, json={"files": [{"path": "a.txt", "content": "a" * (100 * 1024)}]}, headers=h)
    assert fine.status_code == 200


def test_default_rate_limit_applies_to_every_route(client):
    from app.core.security_middleware import RATE_STATE

    RATE_STATE["hits"].clear()
    RATE_STATE["enabled"] = True
    try:
        responses = [client.get(PROJECTS) for _ in range(305)]
    finally:
        RATE_STATE["enabled"] = False
        RATE_STATE["hits"].clear()
    codes = [r.status_code for r in responses]
    assert codes[0] == 401
    assert codes[299] == 401
    assert codes[300] == 429
    assert "retry-after" in responses[300].headers


def test_validation_errors_do_not_echo_input(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "tiny-pw"},
    )
    assert response.status_code == 422
    assert "tiny-pw" not in response.text
    assert set(response.json()["detail"][0]) == {"loc", "msg", "type"}


@pytest.mark.parametrize(
    "text, secret",
    [
        ("Authorization: Bearer abc.def.ghi-123", "abc.def.ghi-123"),
        ('{"password": "hunter2hunter2"}', "hunter2hunter2"),
        ("login?password=hunter2hunter2&x=1", "hunter2hunter2"),
        ("cookie refresh_token=AbCdEf123456", "AbCdEf123456"),
        ("postgresql+psycopg://buildspace_user:s3cretpw@localhost:5432/buildspace", "s3cretpw"),
    ],
)
def test_redact_removes_secrets(text, secret):
    out = redact(text)
    assert secret not in out
    assert "[REDACTED]" in out


def test_redact_leaves_normal_text_alone():
    line = '127.0.0.1 - "GET /api/v1/projects?sort=updated HTTP/1.1" 200 OK'
    assert redact(line) == line


def test_formatter_redacts_the_whole_record():
    formatter = RedactingFormatter(logging.Formatter("%(message)s"))
    record = logging.LogRecord("t", logging.INFO, __file__, 1, "token=%s", ("abc123def456",), None)
    assert "abc123def456" not in formatter.format(record)


def test_production_rejects_weak_configuration():
    weak = Settings(
        environment="production",
        jwt_secret="CHANGE_ME_TO_A_LONG_RANDOM_STRING",
        database_url="",
        cookie_secure=False,
        rate_limit_enabled=True,
        cors_origins=["http://localhost:5173"],
    )
    assert weak.is_production
    assert len(weak.production_problems()) >= 4


def test_production_accepts_a_good_configuration():
    good = Settings(
        environment="production",
        jwt_secret="a-long-random-looking-secret-0123456789abcdef",
        database_url="postgresql+psycopg://user:pw@db:5432/app",
        cookie_secure=True,
        rate_limit_enabled=True,
        cors_origins=["https://buildspace.example"],
    )
    assert good.production_problems() == []


def test_development_is_not_production():
    assert not Settings(environment="development").is_production

