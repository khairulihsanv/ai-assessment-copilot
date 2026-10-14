from fastapi import status


def get_token(client, email, password, role="DOSEN"):
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


def test_finalize_grade_and_concurrency(client):
    dosen_token = get_token(client, "dosen.eval@example.com", "Password123!", role="DOSEN")
    mhs_token = get_token(client, "mhs.eval@example.com", "Password123!", role="MAHASISWA")

    # 1. Create class
    cls_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={"name": "Kelas Penilaian", "description": "Uji finalize", "subject": "Test"},
    )
    class_id = cls_res.json()["id"]
    enroll_key = cls_res.json()["enrollmentKey"]

    # 2. Join class
    client.post(
        "/classes/join",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"enrollmentKey": enroll_key},
    )

    # 3. Create Assignment with Rubric
    rubric_res = client.post(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Rubrik Coding",
            "criteria": [
                {
                    "label": "Kerapian",
                    "maxScore": 50.0,
                    "weight": 50.0,
                    "answerKey": "Kerapian kode",
                },
                {
                    "label": "Fungsionalitas",
                    "maxScore": 50.0,
                    "weight": 50.0,
                    "answerKey": "Semua fitur berjalan",
                },
            ],
        },
    )
    rubric_id = rubric_res.json()["id"]

    assign_res = client.post(
        f"/classes/{class_id}/assignments",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Tugas 1",
            "instructions": "Buat fungsi login",
            "dueDate": "2026-12-31T23:59:59Z",
            "maxScore": 100.0,
            "rubricId": rubric_id,
            "status": "PUBLISHED",
        },
    )
    assignment_id = assign_res.json()["id"]

    # 4. Student submits
    sub_res = client.post(
        f"/classes/{class_id}/assignments/{assignment_id}/submissions",
        headers={"Authorization": f"Bearer {mhs_token}"},
        data={"content": "Berikut adalah kode login saya yang rapi dan fungsional."},
    )
    assert sub_res.status_code == status.HTTP_201_CREATED
    sub_id = sub_res.json()["submissionId"]
    ver_id = sub_res.json()["versionId"]

    # 5. Dosen evaluates via AI endpoint
    grade_ai_res = client.post(
        f"/submissions/{sub_id}/grade",
        headers={"Authorization": f"Bearer {dosen_token}"},
    )
    assert grade_ai_res.status_code == status.HTTP_200_OK
    assert "aiEvaluation" in grade_ai_res.json()

    # 6. Dosen finalizes grade
    finalize_res = client.post(
        f"/submissions/{sub_id}/finalize",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "expectedSubmissionVersionId": ver_id,
            "expectedReleasedGradeId": None,
            "finalScore": 95.0,
            "finalFeedback": "Kerja bagus, kode sangat bersih dan terstruktur.",
            "isAIAssisted": True,
            "editedFromAI": False,
        },
    )
    assert finalize_res.status_code == status.HTTP_200_OK
    grade_data = finalize_res.json()["grade"]
    assert grade_data["finalScore"] == 95.0
    assert grade_data["status"] == "RELEASED"
    released_grade_id = grade_data["id"]

    # 7. Concurrency conflict test: Re-submitting with stale expectedReleasedGradeId=None should fail with 409
    stale_res = client.post(
        f"/submissions/{sub_id}/finalize",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "expectedSubmissionVersionId": ver_id,
            "expectedReleasedGradeId": None,  # Stale! It was released now
            "finalScore": 90.0,
            "finalFeedback": "Update skor",
        },
    )
    assert stale_res.status_code == status.HTTP_409_CONFLICT

    # 8. Student checks result: must see the released grade
    result_res = client.get(
        f"/classes/{class_id}/assignments/{assignment_id}/result",
        headers={"Authorization": f"Bearer {mhs_token}"},
    )
    assert result_res.status_code == status.HTTP_200_OK
    assert result_res.json()["grade"]["finalScore"] == 95.0


def test_student_cannot_finalize(client):
    dosen_token = get_token(client, "dosen.fin@example.com", "Password123!", role="DOSEN")
    mhs_token = get_token(client, "mhs.fin@example.com", "Password123!", role="MAHASISWA")

    # Create class & assignment
    cls_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={"name": "Kelas Finalize Test", "description": "Test", "subject": "Test"},
    )
    class_id = cls_res.json()["id"]
    enroll_key = cls_res.json()["enrollmentKey"]

    client.post(
        "/classes/join",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"enrollmentKey": enroll_key},
    )

    assign_res = client.post(
        f"/classes/{class_id}/assignments",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Tugas Finalize",
            "instructions": "Test",
            "dueDate": "2026-12-31T23:59:59Z",
            "maxScore": 100.0,
            "status": "PUBLISHED",
        },
    )
    assignment_id = assign_res.json()["id"]

    sub_res = client.post(
        f"/classes/{class_id}/assignments/{assignment_id}/submissions",
        headers={"Authorization": f"Bearer {mhs_token}"},
        data={"content": "Jawaban mahasiswa"},
    )
    sub_id = sub_res.json()["submissionId"]
    ver_id = sub_res.json()["versionId"]

    # Student attempts to finalize grade
    hack_res = client.post(
        f"/submissions/{sub_id}/finalize",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={
            "expectedSubmissionVersionId": ver_id,
            "expectedReleasedGradeId": None,
            "finalScore": 100.0,
            "finalFeedback": "Saya beri nilai 100 sendiri",
        },
    )
    assert hack_res.status_code == status.HTTP_403_FORBIDDEN
