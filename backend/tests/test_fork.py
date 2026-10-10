from app.services.projects import MAX_PROJECTS_PER_USER

PUBLIC = "/api/v1/public/projects"
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


def make(client, headers, title="Original", public=True):
    created = client.post(PROJECTS, json={"title": title}, headers=headers).json()
    if public:
        client.patch(f"{PROJECTS}/{created['id']}", json={"visibility": "public"}, headers=headers)
    return created


def fork(client, headers, slug):
    return client.post(f"{PUBLIC}/{slug}/fork", headers=headers)


def test_fork_requires_login(client):
    alice = auth(client, "alice")
    project = make(client, alice)
    client.cookies.clear()
    assert client.post(f"{PUBLIC}/{project['slug']}/fork").status_code == 401


def test_fork_copies_project_privately(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice, "Original")
    response = fork(client, bob, original["slug"])
    assert response.status_code == 201
    copy = response.json()
    assert copy["id"] != original["id"]
    assert copy["slug"] != original["slug"]
    assert copy["title"] == "Original (fork)"
    assert copy["visibility"] == "private"
    assert copy["forked_from_id"] == original["id"]
    assert [f["path"] for f in copy["files"]] == ["index.html", "script.js", "styles.css"]
    mine = client.get(PROJECTS, headers=bob).json()
    assert [p["title"] for p in mine] == ["Original (fork)"]


def test_fork_is_independent_of_original(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice)
    copy = fork(client, bob, original["slug"]).json()
    saved = client.put(
        f"{PROJECTS}/{copy['id']}/files",
        json={"files": [{"path": "only.txt", "content": "bob was here"}]},
        headers=bob,
    )
    assert saved.status_code == 200
    untouched = client.get(f"{PROJECTS}/{original['id']}", headers=alice).json()
    assert len(untouched["files"]) == 3
    assert "bob was here" not in str(untouched)


def test_bob_cannot_modify_original_through_fork(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice)
    fork(client, bob, original["slug"])
    url = f"{PROJECTS}/{original['id']}"
    assert client.get(url, headers=bob).status_code == 404
    assert client.patch(url, json={"title": "Hacked"}, headers=bob).status_code == 404
    assert client.put(f"{url}/files", json={"files": []}, headers=bob).status_code == 404
    assert client.delete(url, headers=bob).status_code == 404


def test_cannot_fork_private_or_unknown(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    private = make(client, alice, "Secret", public=False)
    from_private = fork(client, bob, private["slug"])
    from_unknown = fork(client, bob, "no-such-project-12345678")
    assert from_private.status_code == 404
    assert from_unknown.status_code == 404
    assert from_private.json() == from_unknown.json()
    assert client.get(PROJECTS, headers=bob).json() == []


def test_fork_keeps_working_after_parent_is_deleted(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice)
    copy = fork(client, bob, original["slug"]).json()
    client.delete(f"{PROJECTS}/{original['id']}", headers=alice)
    survivor = client.get(f"{PROJECTS}/{copy['id']}", headers=bob)
    assert survivor.status_code == 200
    assert survivor.json()["forked_from_id"] is None
    assert len(survivor.json()["files"]) == 3


def test_public_page_shows_attribution(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice, "Original")
    copy = fork(client, bob, original["slug"]).json()
    client.patch(f"{PROJECTS}/{copy['id']}", json={"visibility": "public"}, headers=bob)
    page = client.get(f"{PUBLIC}/{copy['slug']}").json()
    assert page["author"] == "bob"
    assert page["forked_from"] == {
        "slug": original["slug"],
        "title": "Original",
        "author": "alice",
    }
    assert client.get(f"{PUBLIC}/{original['slug']}").json()["forked_from"] is None


def test_attribution_hidden_when_parent_goes_private(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice, "Secret idea")
    copy = fork(client, bob, original["slug"]).json()
    client.patch(f"{PROJECTS}/{copy['id']}", json={"visibility": "public"}, headers=bob)
    client.patch(f"{PROJECTS}/{original['id']}", json={"visibility": "private"}, headers=alice)
    response = client.get(f"{PUBLIC}/{copy['slug']}")
    assert response.json()["forked_from"] is None
    assert "Secret idea" not in response.text.replace(copy["title"], "")


def test_fork_respects_project_limit(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice)
    for i in range(MAX_PROJECTS_PER_USER):
        assert client.post(PROJECTS, json={"title": f"P{i}"}, headers=bob).status_code == 201
    assert fork(client, bob, original["slug"]).status_code == 403


def test_forking_twice_makes_two_copies(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    original = make(client, alice)
    first = fork(client, bob, original["slug"]).json()
    second = fork(client, bob, original["slug"]).json()
    assert first["id"] != second["id"]
    assert first["slug"] != second["slug"]
