from datetime import datetime

import pytest
from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models import ProjectFile
from app.services.projects import MAX_PROJECTS_PER_USER

BASE = "/api/v1/projects"


def auth(client, username="alice"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "correct-horse-battery",
        },
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create(client, headers, title="My project", **extra):
    return client.post(BASE, json={"title": title, **extra}, headers=headers)


def save(client, headers, project_id, files):
    return client.put(f"{BASE}/{project_id}/files", json={"files": files}, headers=headers)


def test_requires_auth(client):
    assert client.get(BASE).status_code == 401
    assert client.post(BASE, json={"title": "x"}).status_code == 401
    assert client.get(f"{BASE}/some-id").status_code == 401


def test_create_project_has_starter_files(client):
    h = auth(client)
    response = create(client, h, "My Portfolio!", description="  hello  ")
    assert response.status_code == 201
    body = response.json()
    assert body["visibility"] == "private"
    assert body["description"] == "hello"
    assert body["slug"].startswith("my-portfolio-")
    assert [f["path"] for f in body["files"]] == ["index.html", "script.js", "styles.css"]


def test_create_rejects_blank_title(client):
    h = auth(client)
    assert create(client, h, "   ").status_code == 422
    assert create(client, h, "x" * 61).status_code == 422


def test_list_only_own_projects(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    create(client, alice, "A1")
    create(client, alice, "A2")
    create(client, bob, "B1")
    titles = [p["title"] for p in client.get(BASE, headers=alice).json()]
    assert sorted(titles) == ["A1", "A2"]


def test_list_search_and_sort(client):
    h = auth(client)
    for title in ["Banana", "apple", "Cherry"]:
        create(client, h, title)
    by_title = [p["title"] for p in client.get(BASE, params={"sort": "title"}, headers=h).json()]
    assert by_title == ["apple", "Banana", "Cherry"]
    by_updated = [p["title"] for p in client.get(BASE, headers=h).json()]
    assert by_updated[0] == "Cherry"
    found = client.get(BASE, params={"q": "ban"}, headers=h).json()
    assert [p["title"] for p in found] == ["Banana"]
    # LIKE wildcards are escaped, so "%" does not match everything.
    assert client.get(BASE, params={"q": "%"}, headers=h).json() == []


def test_get_project_includes_files(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    body = client.get(f"{BASE}/{pid}", headers=h).json()
    assert len(body["files"]) == 3
    assert "Hello, BuildSpace" in body["files"][0]["content"]


def test_patch_updates_metadata(client):
    h = auth(client)
    created = create(client, h).json()
    response = client.patch(
        f"{BASE}/{created['id']}",
        json={"title": "New name", "description": "d", "visibility": "public"},
        headers=h,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "New name"
    assert body["visibility"] == "public"
    assert body["slug"] == created["slug"]
    bad = client.patch(f"{BASE}/{created['id']}", json={"visibility": "secret"}, headers=h)
    assert bad.status_code == 422


def test_patch_rejects_blank_title(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    assert client.patch(f"{BASE}/{pid}", json={"title": " "}, headers=h).status_code == 422


def test_save_files_replaces_file_set(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    files = [
        {"path": "index.html", "content": "<h1>Changed</h1>"},
        {"path": "css/new.css", "content": "body{}"},
    ]
    response = save(client, h, pid, files)
    assert response.status_code == 200
    saved = {f["path"]: f["content"] for f in client.get(f"{BASE}/{pid}", headers=h).json()["files"]}
    assert saved == {"index.html": "<h1>Changed</h1>", "css/new.css": "body{}"}


def test_save_accepts_nested_paths(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    files = [{"path": "a/b/c/d.txt", "content": "ok"}, {"path": "README.md", "content": ""}]
    assert save(client, h, pid, files).status_code == 200


def test_save_updates_timestamp(client):
    h = auth(client)
    created = create(client, h).json()
    before = datetime.fromisoformat(created["updated_at"])
    after = datetime.fromisoformat(
        save(client, h, created["id"], [{"path": "a.txt", "content": "x"}]).json()["updated_at"]
    )
    assert after > before


@pytest.mark.parametrize(
    "bad",
    [
        "../x", "a//b", ".hidden", "/abs", "a/../b", "a b.txt", "x" * 65,
        "a/b/c/d/e/f.txt", "back\\slash", "trailing/", "", "index.html\n",
    ],
)
def test_save_rejects_bad_paths(client, bad):
    h = auth(client)
    pid = create(client, h).json()["id"]
    assert save(client, h, pid, [{"path": bad, "content": ""}]).status_code == 422


def test_save_rejects_duplicate_paths(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    files = [{"path": "a.txt", "content": ""}, {"path": "a.txt", "content": ""}]
    assert save(client, h, pid, files).status_code == 422


def test_save_rejects_file_acting_as_folder(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    files = [{"path": "a", "content": ""}, {"path": "a/b.txt", "content": ""}]
    assert save(client, h, pid, files).status_code == 422


def test_save_rejects_oversized_file(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    big = "a" * (500 * 1024 + 1)
    assert save(client, h, pid, [{"path": "big.txt", "content": big}]).status_code == 422


def test_save_rejects_oversized_project(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    chunk = "a" * (450 * 1024)
    files = [{"path": f"f{i}.txt", "content": chunk} for i in range(5)]
    assert save(client, h, pid, files).status_code == 422


def test_save_rejects_null_bytes(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    assert save(client, h, pid, [{"path": "a.txt", "content": "a\u0000b"}]).status_code == 422


def test_save_rejects_too_many_files(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    files = [{"path": f"f{i}.txt", "content": ""} for i in range(101)]
    assert save(client, h, pid, files).status_code == 422


def test_delete_project_removes_files(client):
    h = auth(client)
    pid = create(client, h).json()["id"]
    assert client.delete(f"{BASE}/{pid}", headers=h).status_code == 204
    assert client.get(f"{BASE}/{pid}", headers=h).status_code == 404
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(ProjectFile)) == 0


def test_duplicate_is_independent_and_private(client):
    h = auth(client)
    original = create(client, h, "Original", visibility="public").json()
    copy = client.post(f"{BASE}/{original['id']}/duplicate", headers=h).json()
    assert copy["id"] != original["id"]
    assert copy["slug"] != original["slug"]
    assert copy["title"] == "Original (copy)"
    assert copy["visibility"] == "private"
    assert len(copy["files"]) == 3
    save(client, h, copy["id"], [{"path": "only.txt", "content": "x"}])
    untouched = client.get(f"{BASE}/{original['id']}", headers=h).json()
    assert len(untouched["files"]) == 3


def test_other_users_cannot_touch_project(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    pid = create(client, alice, "Secret").json()["id"]
    url = f"{BASE}/{pid}"
    assert client.get(url, headers=bob).status_code == 404
    assert client.patch(url, json={"title": "Hacked"}, headers=bob).status_code == 404
    assert client.put(f"{url}/files", json={"files": []}, headers=bob).status_code == 404
    assert client.post(f"{url}/duplicate", headers=bob).status_code == 404
    assert client.delete(url, headers=bob).status_code == 404
    assert client.get(f"{BASE}/does-not-exist", headers=bob).status_code == 404
    assert client.get(BASE, headers=bob).json() == []
    mine = client.get(url, headers=alice)
    assert mine.status_code == 200
    assert mine.json()["title"] == "Secret"
    assert len(mine.json()["files"]) == 3


def test_project_limit(client):
    h = auth(client)
    for i in range(MAX_PROJECTS_PER_USER):
        assert create(client, h, f"P{i}").status_code == 201
    assert create(client, h, "One too many").status_code == 403
