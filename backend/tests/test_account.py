from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models import Project, RefreshSession, User

AUTH = "/api/v1/auth"
PROJECTS = "/api/v1/projects"
PW = "correct-horse-battery"


def register(client, username="alice"):
    response = client.post(
        f"{AUTH}/register",
        json={"username": username, "email": f"{username}@example.com", "password": PW},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def login(client, username="alice", password=PW):
    return client.post(f"{AUTH}/login", json={"email": f"{username}@example.com", "password": password})


def count(model):
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(model))


def test_account_routes_require_login(client):
    assert client.patch(f"{AUTH}/me", json={"username": "abc"}).status_code == 401
    body = {"current_password": PW, "new_password": "another-long-password"}
    assert client.post(f"{AUTH}/change-password", json=body).status_code == 401
    assert client.post(f"{AUTH}/delete-account", json={"password": PW}).status_code == 401


def test_update_username(client):
    h = register(client)
    response = client.patch(f"{AUTH}/me", json={"username": "  Alice_New "}, headers=h)
    assert response.status_code == 200
    assert response.json()["username"] == "alice_new"
    assert client.get(f"{AUTH}/me", headers=h).json()["username"] == "alice_new"


def test_update_to_same_username_is_fine(client):
    h = register(client)
    assert client.patch(f"{AUTH}/me", json={"username": "alice"}, headers=h).status_code == 200


def test_username_taken(client):
    register(client, "alice")
    bob = register(client, "bob")
    response = client.patch(f"{AUTH}/me", json={"username": "ALICE"}, headers=bob)
    assert response.status_code == 409
    assert client.get(f"{AUTH}/me", headers=bob).json()["username"] == "bob"


def test_invalid_username(client):
    h = register(client)
    assert client.patch(f"{AUTH}/me", json={"username": "a b"}, headers=h).status_code == 422
    assert client.patch(f"{AUTH}/me", json={"username": "ab"}, headers=h).status_code == 422


def test_change_password_needs_correct_current_password(client):
    h = register(client)
    body = {"current_password": "not-my-password", "new_password": "another-long-password"}
    assert client.post(f"{AUTH}/change-password", json=body, headers=h).status_code == 403
    assert login(client).status_code == 200


def test_change_password_success(client):
    h = register(client)
    body = {"current_password": PW, "new_password": "another-long-password"}
    response = client.post(f"{AUTH}/change-password", json=body, headers=h)
    assert response.status_code == 200
    assert response.json()["access_token"]
    assert login(client, password=PW).status_code == 401
    assert login(client, password="another-long-password").status_code == 200


def test_change_password_rejects_same_or_short_password(client):
    h = register(client)
    same = {"current_password": PW, "new_password": PW}
    assert client.post(f"{AUTH}/change-password", json=same, headers=h).status_code == 422
    short = {"current_password": PW, "new_password": "short"}
    assert client.post(f"{AUTH}/change-password", json=short, headers=h).status_code == 422


def test_change_password_ends_other_sessions_but_keeps_this_one(client):
    register(client)
    other_device = client.cookies.get("refresh_token")
    client.cookies.clear()
    this_device = login(client)
    h = {"Authorization": f"Bearer {this_device.json()['access_token']}"}

    body = {"current_password": PW, "new_password": "another-long-password"}
    assert client.post(f"{AUTH}/change-password", json=body, headers=h).status_code == 200

    assert client.post(f"{AUTH}/refresh").status_code == 200  # this browser stays signed in
    client.cookies.clear()
    stale = client.post(f"{AUTH}/refresh", headers={"Cookie": f"refresh_token={other_device}"})
    assert stale.status_code == 401  # the other device is signed out


def test_delete_account_needs_correct_password(client):
    h = register(client)
    response = client.post(f"{AUTH}/delete-account", json={"password": "wrong-password"}, headers=h)
    assert response.status_code == 403
    assert client.get(f"{AUTH}/me", headers=h).status_code == 200
    assert count(User) == 1


def test_delete_account_removes_everything(client):
    h = register(client)
    client.post(PROJECTS, json={"title": "P"}, headers=h)
    assert count(Project) == 1

    response = client.post(f"{AUTH}/delete-account", json={"password": PW}, headers=h)
    assert response.status_code == 204

    assert login(client).status_code == 401
    assert client.get(f"{AUTH}/me", headers=h).status_code == 401
    assert count(User) == 0
    assert count(Project) == 0
    assert count(RefreshSession) == 0


def test_delete_account_leaves_other_users_and_their_forks(client):
    alice = register(client, "alice")
    project = client.post(PROJECTS, json={"title": "Mine"}, headers=alice).json()
    client.patch(f"{PROJECTS}/{project['id']}", json={"visibility": "public"}, headers=alice)
    bob = register(client, "bob")
    fork = client.post(f"/api/v1/public/projects/{project['slug']}/fork", headers=bob).json()
    assert fork["forked_from_id"] == project["id"]

    assert client.post(f"{AUTH}/delete-account", json={"password": PW}, headers=alice).status_code == 204

    survivor = client.get(f"{PROJECTS}/{fork['id']}", headers=bob)
    assert survivor.status_code == 200
    assert survivor.json()["forked_from_id"] is None
    assert len(survivor.json()["files"]) == 3
    assert client.get(f"{AUTH}/me", headers=bob).status_code == 200
    assert count(User) == 1
