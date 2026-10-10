BASE = "/api/v1/public/projects"
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


def make(client, headers, title="Demo", description="", public=True):
    created = client.post(
        PROJECTS, json={"title": title, "description": description}, headers=headers
    ).json()
    if public:
        patched = client.patch(
            f"{PROJECTS}/{created['id']}", json={"visibility": "public"}, headers=headers
        )
        assert patched.status_code == 200
    return created


def titles(response):
    assert response.status_code == 200
    return [p["title"] for p in response.json()]


def test_public_project_needs_no_login(client):
    h = auth(client)
    project = make(client, h, "Demo")
    client.cookies.clear()
    response = client.get(f"{BASE}/{project['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Demo"
    assert body["author"] == "alice"
    assert len(body["files"]) == 3
    assert response.headers["cache-control"] == "no-store"


def test_response_does_not_leak_private_fields(client):
    h = auth(client)
    project = make(client, h, "Demo")
    response = client.get(f"{BASE}/{project['slug']}")
    assert set(response.json()) == {
        "slug", "title", "description", "author", "created_at", "updated_at", "files",
    }
    assert "alice@example.com" not in response.text
    assert project["id"] not in response.text


def test_private_project_is_hidden(client):
    h = auth(client)
    project = make(client, h, "Secret", public=False)
    private = client.get(f"{BASE}/{project['slug']}")
    unknown = client.get(f"{BASE}/no-such-project-12345678")
    assert private.status_code == 404
    assert unknown.status_code == 404
    assert private.json() == unknown.json()


def test_making_private_again_hides_it(client):
    h = auth(client)
    project = make(client, h, "Demo")
    assert client.get(f"{BASE}/{project['slug']}").status_code == 200
    client.patch(f"{PROJECTS}/{project['id']}", json={"visibility": "private"}, headers=h)
    assert client.get(f"{BASE}/{project['slug']}").status_code == 404
    assert titles(client.get(BASE)) == []


def test_deleted_project_disappears(client):
    h = auth(client)
    project = make(client, h, "Demo")
    client.delete(f"{PROJECTS}/{project['id']}", headers=h)
    assert client.get(f"{BASE}/{project['slug']}").status_code == 404
    assert titles(client.get(BASE)) == []


def test_gallery_lists_only_public_projects(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    make(client, alice, "Alice public")
    make(client, alice, "Alice secret", public=False)
    make(client, bob, "Bob public")
    response = client.get(BASE)
    assert sorted(titles(response)) == ["Alice public", "Bob public"]
    for entry in response.json():
        assert "files" not in entry
    assert "@example.com" not in response.text


def test_gallery_search_covers_title_description_and_author(client):
    alice, bob = auth(client, "alice"), auth(client, "bob")
    make(client, alice, "Weather app", description="Shows forecasts")
    make(client, bob, "Chess")
    assert titles(client.get(BASE, params={"q": "weather"})) == ["Weather app"]
    assert titles(client.get(BASE, params={"q": "FORECAST"})) == ["Weather app"]
    assert titles(client.get(BASE, params={"q": "bob"})) == ["Chess"]
    assert titles(client.get(BASE, params={"q": "nothing-matches"})) == []


def test_gallery_search_escapes_wildcards(client):
    h = auth(client)
    make(client, h, "Demo")
    assert titles(client.get(BASE, params={"q": "%"})) == []
    assert titles(client.get(BASE, params={"q": "_"})) == []


def test_gallery_sorting(client):
    h = auth(client)
    for title in ["banana", "Apple", "cherry"]:
        make(client, h, title)
    assert titles(client.get(BASE)) == ["cherry", "Apple", "banana"]
    assert titles(client.get(BASE, params={"sort": "title"})) == ["Apple", "banana", "cherry"]


def test_gallery_pagination(client):
    h = auth(client)
    for i in range(3):
        make(client, h, f"P{i}")
    assert titles(client.get(BASE, params={"limit": 2})) == ["P2", "P1"]
    assert titles(client.get(BASE, params={"limit": 2, "offset": 2})) == ["P0"]
    assert titles(client.get(BASE, params={"limit": 2, "offset": 5})) == []


def test_gallery_rejects_bad_parameters(client):
    for params in [{"limit": 0}, {"limit": 51}, {"offset": -1}, {"sort": "random"}]:
        assert client.get(BASE, params=params).status_code == 422


def test_public_endpoints_are_read_only(client):
    h = auth(client)
    project = make(client, h, "Demo")
    url = f"{BASE}/{project['slug']}"
    assert client.post(BASE, json={}).status_code == 405
    assert client.put(url, json={}).status_code == 405
    assert client.patch(url, json={"title": "Hacked"}).status_code == 405
    assert client.delete(url).status_code == 405
