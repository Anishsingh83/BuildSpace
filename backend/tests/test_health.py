from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_allows_frontend_origin() -> None:
    response = client.get(
        "/api/v1/health", headers={"Origin": "http://localhost:5173"}
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocks_unknown_origin() -> None:
    response = client.get(
        "/api/v1/health", headers={"Origin": "http://evil.example"}
    )
    assert "access-control-allow-origin" not in response.headers
