from fastapi import status


def get_token(client, email, password):
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_create_and_list_classes(client):
    dosen_token = get_token(client, "dosen.test@example.com", "Password123!")

    # 1. Create class
    res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "name": "Kecerdasan Buatan A",
            "description": "Kelas AI dan RAG",
            "subject": "Informatika",
        },
    )
    assert res.status_code == status.HTTP_201_CREATED
    class_data = res.json()
    assert class_data["name"] == "Kecerdasan Buatan A"
    assert "enrollmentKey" in class_data
    key = class_data["enrollmentKey"]
    class_id = class_data["id"]

    # 2. Dosen list classes
    list_res = client.get("/classes", headers={"Authorization": f"Bearer {dosen_token}"})
    assert list_res.status_code == status.HTTP_200_OK
    classes = list_res.json()
    assert any(c["id"] == class_id for c in classes)

    # 3. Student joins class
    mhs_token = get_token(client, "mhs.test@example.com", "Password123!")
    join_res = client.post(
        "/classes/join",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"enrollmentKey": key},
    )
    assert join_res.status_code == status.HTTP_201_CREATED

    # 4. Student list classes (enrollmentKey should NOT be present)
    mhs_list = client.get("/classes", headers={"Authorization": f"Bearer {mhs_token}"})
    assert mhs_list.status_code == status.HTTP_200_OK
    m_classes = mhs_list.json()
    joined_cls = next(c for c in m_classes if c["id"] == class_id)
    assert "enrollmentKey" not in joined_cls
