from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import RefreshSession, User

BASE = "/api/v1/auth"
VALID = {"username": "alice", "email": "alice@example.com", "password": "correct-horse-battery"}


def register(client, **overrides):
    return client.post(f"{BASE}/register", json={**VALID, **overrides})


def test_register_success(client):
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["user"]["username"] == "alice"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]
    assert client.cookies.get("refresh_token")


def test_register_duplicate_username(client):
    register(client)
    response = register(client, email="other@example.com")
    assert response.status_code == 409


def test_register_duplicate_email(client):
    register(client)
    response = register(client, username="bob")
    assert response.status_code == 409


def test_register_rejects_short_password(client):
    assert register(client, password="short").status_code == 422


def test_register_rejects_bad_username(client):
    assert register(client, username="a b").status_code == 422
    assert register(client, username="ab").status_code == 422


def test_password_is_stored_as_argon2id_hash(client):
    register(client)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == "alice"))
        assert user is not None
        assert user.password_hash.startswith("$argon2id$")
        assert VALID["password"] not in user.password_hash


def test_refresh_token_is_stored_hashed(client):
    register(client)
    raw = client.cookies.get("refresh_token")
    with SessionLocal() as db:
        stored = db.scalar(select(RefreshSession))
        assert stored is not None
        assert stored.token_hash != raw
        assert len(stored.token_hash) == 64


def test_login_success(client):
    register(client)
    client.cookies.clear()
    response = client.post(
        f"{BASE}/login", json={"email": VALID["email"], "password": VALID["password"]}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_wrong_password(client):
    register(client)
    response = client.post(f"{BASE}/login", json={"email": VALID["email"], "password": "wrong-password"})
    assert response.status_code == 401


def test_login_unknown_email_gives_same_error(client):
    register(client)
    wrong_pw = client.post(f"{BASE}/login", json={"email": VALID["email"], "password": "wrong-password"})
    unknown = client.post(f"{BASE}/login", json={"email": "nobody@example.com", "password": "wrong-password"})
    assert unknown.status_code == 401
    assert unknown.json() == wrong_pw.json()


def test_me_requires_token(client):
    assert client.get(f"{BASE}/me").status_code == 401
    assert client.get(f"{BASE}/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_me_returns_current_user(client):
    token = register(client).json()["access_token"]
    response = client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == VALID["email"]


def test_refresh_rotates_token(client):
    register(client)
    old = client.cookies.get("refresh_token")
    response = client.post(f"{BASE}/refresh")
    assert response.status_code == 200
    assert response.json()["access_token"]
    new = client.cookies.get("refresh_token")
    assert new and new != old


def test_reusing_old_refresh_token_revokes_all_sessions(client):
    register(client)
    old = client.cookies.get("refresh_token")
    client.post(f"{BASE}/refresh")
    new = client.cookies.get("refresh_token")
    client.cookies.clear()

    reused = client.post(f"{BASE}/refresh", headers={"Cookie": f"refresh_token={old}"})
    assert reused.status_code == 401
    # Theft assumed: even the newest token no longer works.
    after = client.post(f"{BASE}/refresh", headers={"Cookie": f"refresh_token={new}"})
    assert after.status_code == 401


def test_logout_revokes_session(client):
    register(client)
    token = client.cookies.get("refresh_token")
    assert client.post(f"{BASE}/logout").status_code == 204
    client.cookies.clear()
    response = client.post(f"{BASE}/refresh", headers={"Cookie": f"refresh_token={token}"})
    assert response.status_code == 401


def test_refresh_without_cookie(client):
    client.cookies.clear()
    assert client.post(f"{BASE}/refresh").status_code == 401
