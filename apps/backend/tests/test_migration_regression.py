from fastapi import status


def get_token(client, email, password, role="MAHASISWA"):
    res = client.post("/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
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


def test_rubric_weight_validation(client):
    dosen_token = get_token(client, "dosen.weight@example.com", "Password123!", role="DOSEN")

    # Create class
    cls_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={"name": "Kelas Uji Bobot", "description": "Bobot test", "subject": "Test"},
    )
    assert cls_res.status_code == status.HTTP_201_CREATED
    class_id = cls_res.json()["id"]

    # 1. Total weight 70% (Must fail validation)
    res_fail = client.post(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Rubrik Tidak Valid",
            "criteria": [
                {"label": "Kriteria 1", "maxScore": 50, "weight": 70},
            ],
        },
    )
    assert res_fail.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 2. Total weight 40 + 60 = 100% (Must succeed)
    res_ok = client.post(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Rubrik Tepat 100%",
            "criteria": [
                {"label": "Kriteria 1", "maxScore": 50, "weight": 40},
                {"label": "Kriteria 2", "maxScore": 50, "weight": 60},
            ],
        },
    )
    assert res_ok.status_code == status.HTTP_201_CREATED
    assert res_ok.json()["title"] == "Rubrik Tepat 100%"


def test_class_detail_enrollments_contains_user_id(client):
    dosen_token = get_token(client, "dosen.enrollment@example.com", "Password123!", role="DOSEN")
    mhs_token = get_token(client, "mhs.enrollment@example.com", "Password123!", role="MAHASISWA")

    # Get student me
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {mhs_token}"})
    student_id = me_res.json()["id"]

    # Dosen creates class
    cls_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={"name": "Kelas Detail Check", "description": "Check", "subject": "TI"},
    )
    class_id = cls_res.json()["id"]
    enroll_key = cls_res.json()["enrollmentKey"]

    # Student joins
    join_res = client.post(
        "/classes/join",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"enrollmentKey": enroll_key},
    )
    assert join_res.status_code == status.HTTP_201_CREATED

    # Student inspects class details
    cls_detail = client.get(
        f"/classes/{class_id}",
        headers={"Authorization": f"Bearer {mhs_token}"},
    )
    assert cls_detail.status_code == status.HTTP_200_OK
    enrollments = cls_detail.json()["enrollments"]
    assert len(enrollments) >= 1
    # Check that each enrollment item contains the userId field
    assert any(e.get("userId") == student_id for e in enrollments)


def test_student_cannot_finalize_grade(client):
    mhs_token = get_token(client, "mhs.finalize@example.com", "Password123!", role="MAHASISWA")
    res = client.post(
        "/submissions/dummy-sub-id/finalize",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={
            "expectedSubmissionVersionId": "v1",
            "expectedReleasedGradeId": None,
            "finalScore": 90,
            "finalFeedback": "Good",
            "isAIAssisted": False,
            "editedFromAI": False,
        },
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
