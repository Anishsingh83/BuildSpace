from app.services.paths import validate_file_set
from app.services.templates import TEMPLATE_FILES, TEMPLATE_IDS, TEMPLATE_INFO

PROJECTS = "/api/v1/projects"


def auth(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_template_list_is_public_and_complete(client):
    response = client.get("/api/v1/templates")
    assert response.status_code == 200
    body = response.json()
    assert {t["id"] for t in body} == TEMPLATE_IDS
    assert len(body) == 7
    assert all(set(t) == {"id", "name", "description"} for t in body)


def test_catalog_matches_files():
    assert TEMPLATE_IDS - {"blank"} == set(TEMPLATE_FILES)
    assert len(TEMPLATE_INFO) == len(TEMPLATE_IDS)


def test_every_template_passes_file_validation_and_links_resolve():
    for template_id, files in TEMPLATE_FILES.items():
        validate_file_set(files)
        paths = {path for path, _ in files}
        assert "index.html" in paths, template_id
        index = dict(files)["index.html"]
        for linked in ("styles.css", "script.js"):
            if linked in index:
                assert linked in paths, f"{template_id} links {linked} but does not include it"


def test_create_project_from_each_template(client):
    h = auth(client)
    for template_id, files in TEMPLATE_FILES.items():
        response = client.post(
            PROJECTS, json={"title": f"From {template_id}", "template": template_id}, headers=h
        )
        assert response.status_code == 201, template_id
        created = {f["path"]: f["content"] for f in response.json()["files"]}
        assert created == dict(files)


def test_default_template_is_blank(client):
    h = auth(client)
    explicit = client.post(PROJECTS, json={"title": "A", "template": "blank"}, headers=h).json()
    default = client.post(PROJECTS, json={"title": "B"}, headers=h).json()
    assert explicit["files"] == default["files"]
    assert "Hello, BuildSpace" in default["files"][0]["content"]


def test_unknown_template_is_rejected(client):
    h = auth(client)
    for bad in ["nope", "../etc/passwd", "", "BLANK", "todo "]:
        response = client.post(PROJECTS, json={"title": "X", "template": bad}, headers=h)
        assert response.status_code == 422, bad
    assert client.get(PROJECTS, headers=h).json() == []


def test_editing_a_project_does_not_change_the_template(client):
    h = auth(client)
    first = client.post(PROJECTS, json={"title": "One", "template": "todo"}, headers=h).json()
    client.put(
        f"{PROJECTS}/{first['id']}/files",
        json={"files": [{"path": "index.html", "content": "changed"}]},
        headers=h,
    )
    second = client.post(PROJECTS, json={"title": "Two", "template": "todo"}, headers=h).json()
    assert second["files"] == [{"path": p, "content": c} for p, c in sorted(TEMPLATE_FILES["todo"])]
