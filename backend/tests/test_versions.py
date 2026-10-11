from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models import ProjectVersion
from app.services.versions import MAX_VERSIONS_PER_PROJECT

PROJECTS = "/api/v1/projects"


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


def make(client, headers, title="Demo"):
    return client.post(PROJECTS, json={"title": title}, headers=headers).json()


def vurl(project_id, suffix=""):
    return f"{PROJECTS}/{project_id}/versions{suffix}"


def put_files(client, headers, project_id, files):
    response = client.put(f"{PROJECTS}/{project_id}/files", json={"files": files}, headers=headers)
    assert response.status_code == 200
    return response.json()


def snapshot(client, headers, project_id, message="v"):
    response = client.post(vurl(project_id), json={"message": message}, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_requires_auth(client):
    assert client.get(vurl("x")).status_code == 401
    assert client.post(vurl("x"), json={}).status_code == 401


def test_create_and_list_versions(client):
    h = auth(client)
    pid = make(client, h)["id"]
    first = snapshot(client, h, pid, "  First  ")
    second = snapshot(client, h, pid, "")
    assert first["version_number"] == 1
    assert first["message"] == "First"
    assert first["file_count"] == 3
    assert first["is_auto"] is False
    assert second["version_number"] == 2
    assert second["message"] == "Saved version"
    listed = client.get(vurl(pid), headers=h).json()
    assert [v["version_number"] for v in listed] == [2, 1]
    assert "files" not in listed[0]


def test_get_version_returns_files_as_they_were(client):
    h = auth(client)
    pid = make(client, h)["id"]
    snap = snapshot(client, h, pid, "before")
    put_files(client, h, pid, [{"path": "a.txt", "content": "changed"}])
    detail = client.get(vurl(pid, f"/{snap['id']}"), headers=h).json()
    assert [f["path"] for f in detail["files"]] == ["index.html", "script.js", "styles.css"]
    assert "Hello, BuildSpace" in detail["files"][0]["content"]


def test_restore_round_trip(client):
    h = auth(client)
    pid = make(client, h)["id"]
    snap = snapshot(client, h, pid, "original")
    put_files(client, h, pid, [{"path": "only.txt", "content": "new work"}])
    restored = client.post(vurl(pid, f"/{snap['id']}/restore"), headers=h)
    assert restored.status_code == 200
    assert [f["path"] for f in restored.json()["files"]] == ["index.html", "script.js", "styles.css"]
    current = client.get(f"{PROJECTS}/{pid}", headers=h).json()
    assert len(current["files"]) == 3


def test_restore_saves_safety_snapshot_of_current_state(client):
    h = auth(client)
    pid = make(client, h)["id"]
    snap = snapshot(client, h, pid, "original")
    put_files(client, h, pid, [{"path": "only.txt", "content": "precious work"}])
    client.post(vurl(pid, f"/{snap['id']}/restore"), headers=h)
    listed = client.get(vurl(pid), headers=h).json()
    assert len(listed) == 2
    safety = listed[0]
    assert safety["is_auto"] is True
    assert safety["message"] == "Before restoring version 1"
    detail = client.get(vurl(pid, f"/{safety['id']}"), headers=h).json()
    assert detail["files"] == [{"path": "only.txt", "content": "precious work"}]


def test_restore_can_be_undone(client):
    h = auth(client)
    pid = make(client, h)["id"]
    snap = snapshot(client, h, pid, "original")
    put_files(client, h, pid, [{"path": "only.txt", "content": "precious work"}])
    client.post(vurl(pid, f"/{snap['id']}/restore"), headers=h)
    safety = client.get(vurl(pid), headers=h).json()[0]
    client.post(vurl(pid, f"/{safety['id']}/restore"), headers=h)
    current = client.get(f"{PROJECTS}/{pid}", headers=h).json()
    assert [f["path"] for f in current["files"]] == ["only.txt"]


def test_version_numbers_never_reused_after_delete(client):
    h = auth(client)
    pid = make(client, h)["id"]
    snapshot(client, h, pid)
    second = snapshot(client, h, pid)
    assert client.delete(vurl(pid, f"/{second['id']}"), headers=h).status_code == 204
    third = snapshot(client, h, pid)
    assert third["version_number"] == 2 or third["version_number"] == 3
    numbers = [v["version_number"] for v in client.get(vurl(pid), headers=h).json()]
    assert len(numbers) == len(set(numbers))


def test_other_users_cannot_touch_versions(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    pid = make(client, alice)["id"]
    snap = snapshot(client, alice, pid, "mine")
    assert client.get(vurl(pid), headers=bob).status_code == 404
    assert client.post(vurl(pid), json={"message": "x"}, headers=bob).status_code == 404
    assert client.get(vurl(pid, f"/{snap['id']}"), headers=bob).status_code == 404
    assert client.post(vurl(pid, f"/{snap['id']}/restore"), headers=bob).status_code == 404
    assert client.delete(vurl(pid, f"/{snap['id']}"), headers=bob).status_code == 404
    assert len(client.get(vurl(pid), headers=alice).json()) == 1


def test_version_from_another_project_is_not_reachable(client):
    h = auth(client)
    first = make(client, h, "One")["id"]
    second = make(client, h, "Two")["id"]
    snap = snapshot(client, h, first)
    assert client.get(vurl(second, f"/{snap['id']}"), headers=h).status_code == 404
    assert client.post(vurl(second, f"/{snap['id']}/restore"), headers=h).status_code == 404


def test_unknown_version_is_404(client):
    h = auth(client)
    pid = make(client, h)["id"]
    assert client.get(vurl(pid, "/does-not-exist"), headers=h).status_code == 404


def test_versions_deleted_with_project(client):
    h = auth(client)
    pid = make(client, h)["id"]
    snapshot(client, h, pid)
    client.delete(f"{PROJECTS}/{pid}", headers=h)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(ProjectVersion)) == 0


def test_cap_prunes_oldest_automatic_versions(client):
    h = auth(client)
    pid = make(client, h)["id"]
    with SessionLocal() as db:
        for n in range(1, MAX_VERSIONS_PER_PROJECT + 1):
            db.add(
                ProjectVersion(
                    project_id=pid, version_number=n, snapshot={"files": []},
                    message=f"auto {n}", is_auto=True,
                )
            )
        db.commit()
    snapshot(client, h, pid, "named")
    listed = client.get(vurl(pid), headers=h).json()
    assert len(listed) == MAX_VERSIONS_PER_PROJECT
    assert listed[0]["message"] == "named"
    assert min(v["version_number"] for v in listed) == 2


def test_cap_refuses_when_all_versions_are_named(client):
    h = auth(client)
    pid = make(client, h)["id"]
    with SessionLocal() as db:
        for n in range(1, MAX_VERSIONS_PER_PROJECT + 1):
            db.add(
                ProjectVersion(
                    project_id=pid, version_number=n, snapshot={"files": []},
                    message=f"named {n}", is_auto=False,
                )
            )
        db.commit()
    response = client.post(vurl(pid), json={"message": "one more"}, headers=h)
    assert response.status_code == 409
    assert len(client.get(vurl(pid), headers=h).json()) == MAX_VERSIONS_PER_PROJECT


def test_restore_rejects_invalid_snapshot(client):
    h = auth(client)
    pid = make(client, h)["id"]
    with SessionLocal() as db:
        db.add(
            ProjectVersion(
                project_id=pid, version_number=1, message="bad",
                snapshot={"files": [{"path": "../evil", "content": "x"}]},
            )
        )
        db.commit()
        vid = db.scalar(select(ProjectVersion.id))
    response = client.post(vurl(pid, f"/{vid}/restore"), headers=h)
    assert response.status_code == 422
    current = client.get(f"{PROJECTS}/{pid}", headers=h).json()
    assert len(current["files"]) == 3
