from fastapi import status


def get_token(client, email, password, role="MAHASISWA"):
    res = client.post("/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        # Register user if not exists
        reg = client.post(
            "/auth/register",
            json={
                "name": f"User {role}",
                "email": email,
                "password": password,
                "role": role,
            },
        )
        return reg.json()["access_token"]
    return res.json()["access_token"]


def test_unauthenticated_request_rejected(client):
    res = client.get("/classes")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_student_cannot_create_class(client):
    mhs_token = get_token(client, "mhs.test@example.com", "Password123!")
    res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"name": "Kelas Ilegal"},
    )
    assert res.status_code == status.HTTP_401_UNAUTHORIZED or res.status_code == status.HTTP_403_FORBIDDEN


def test_rubric_public_fields_isolation(client):
    dosen_token = get_token(client, "dosen.rubric@example.com", "Password123!", role="DOSEN")
    mhs_token = get_token(client, "mhs.rubric@example.com", "Password123!", role="MAHASISWA")

    # 1. Create fresh class
    cls_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "name": "Kelas Uji Rubrik",
            "description": "Kelas isolasi",
            "subject": "Testing",
        },
    )
    assert cls_res.status_code == status.HTTP_201_CREATED
    class_id = cls_res.json()["id"]
    enroll_key = cls_res.json()["enrollmentKey"]

    # Student joins class
    join_res = client.post(
        "/classes/join",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"enrollmentKey": enroll_key},
    )
    assert join_res.status_code == status.HTTP_201_CREATED

    # 2. Dosen creates rubric with secret answerKey and material
    rubric_res = client.post(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Rubrik Ujian Akhir",
            "criteria": [
                {
                    "label": "Algoritma Sorting",
                    "description": "Pemahaman QuickSort",
                    "maxScore": 25.0,
                    "weight": 100.0,
                    "answerKey": "KUNCI_RAHASIA_DOSEN_12345",
                    "material": "MATERI_RAHASIA_DOSEN_67890",
                }
            ],
        },
    )
    assert rubric_res.status_code == status.HTTP_201_CREATED

    # 3. Student views rubric: answerKey and material MUST be hidden!
    student_view = client.get(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {mhs_token}"},
    )
    assert student_view.status_code == status.HTTP_200_OK
    criteria = student_view.json()[0]["criteria"]
    assert len(criteria) > 0
    assert criteria[0].get("answerKey") is None
    assert criteria[0].get("material") is None
    assert criteria[0]["label"] == "Algoritma Sorting"
