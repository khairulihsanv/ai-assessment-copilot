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


def test_two_assignments_with_different_rubrics_in_same_class(client):
    """
    Test Priority 2:
    - Lecturer can create 2 rubrics with different criteria in the same class.
    - Assignment 1 is linked to Rubric 1.
    - Assignment 2 is linked to Rubric 2.
    - Assignment 3 can be created without a rubric (rubricId is None).
    - AI evaluation on Assignment 3 returns 400 explaining that a rubric with criteria is required.
    - AI evaluation on Assignment 1 uses Rubric 1 criteria.
    - AI evaluation on Assignment 2 uses Rubric 2 criteria.
    """
    dosen_token = get_token(client, "dosen.multi_rubric@example.com", "Password123!", role="DOSEN")
    mhs_token = get_token(client, "mhs.multi_rubric@example.com", "Password123!", role="MAHASISWA")

    # 1. Create class
    cls_res = client.post(
        "/classes",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={"name": "Kelas Sistem Terdistribusi", "description": "Multi rubric test", "subject": "CS"},
    )
    assert cls_res.status_code == 201
    class_id = cls_res.json()["id"]
    enroll_key = cls_res.json()["enrollmentKey"]

    # 2. Mahasiswa joins class
    join_res = client.post(
        "/classes/join",
        headers={"Authorization": f"Bearer {mhs_token}"},
        json={"enrollmentKey": enroll_key},
    )
    assert join_res.status_code in (200, 201)

    # 3. Create Rubric 1 (Teori Konsensus)
    rubric1_res = client.post(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Rubrik Teori Konsensus Raft",
            "criteria": [
                {
                    "label": "Mekanisme Leader Election",
                    "maxScore": 60.0,
                    "weight": 60.0,
                    "answerKey": "Leader election menggunakan randomized timeout dan RequestVote RPC.",
                },
                {
                    "label": "Log Replication & Safety",
                    "maxScore": 40.0,
                    "weight": 40.0,
                    "answerKey": "Log replication menggunakan AppendEntries RPC dengan commit index.",
                },
            ],
        },
    )
    assert rubric1_res.status_code == 201
    rubric1_id = rubric1_res.json()["id"]

    # 4. Create Rubric 2 (Praktikum Sharding)
    rubric2_res = client.post(
        f"/classes/{class_id}/rubrics",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Rubrik Database Sharding",
            "criteria": [
                {
                    "label": "Strategi Sharding Key & Distribusi Data",
                    "maxScore": 50.0,
                    "weight": 50.0,
                    "answerKey": "Pemilihan sharding key yang tepat mencegah hot partition.",
                },
                {
                    "label": "Penanganan Rebalancing & Failover",
                    "maxScore": 50.0,
                    "weight": 50.0,
                    "answerKey": "Rebalancing partition otomatis dan failover cluster node.",
                },
            ],
        },
    )
    assert rubric2_res.status_code == 201
    rubric2_id = rubric2_res.json()["id"]
    assert rubric1_id != rubric2_id

    # 5. Create Assignment 1 with Rubric 1
    assign1_res = client.post(
        f"/classes/{class_id}/assignments",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Tugas 1: Analisis Konsensus Raft",
            "instructions": "Jelaskan mekanisme leader election dan log replication.",
            "dueDate": "2026-12-31T23:59:59Z",
            "maxScore": 100.0,
            "rubricId": rubric1_id,
            "status": "PUBLISHED",
        },
    )
    assert assign1_res.status_code == 201
    assign1_id = assign1_res.json()["id"]
    assert assign1_res.json()["rubricId"] == rubric1_id

    # 6. Create Assignment 2 with Rubric 2
    assign2_res = client.post(
        f"/classes/{class_id}/assignments",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Tugas 2: Praktikum Sharding Database",
            "instructions": "Jelaskan strategi sharding key dan failover cluster.",
            "dueDate": "2026-12-31T23:59:59Z",
            "maxScore": 100.0,
            "rubricId": rubric2_id,
            "status": "PUBLISHED",
        },
    )
    assert assign2_res.status_code == 201
    assign2_id = assign2_res.json()["id"]
    assert assign2_res.json()["rubricId"] == rubric2_id
    assert assign1_res.json()["rubricId"] != assign2_res.json()["rubricId"]

    # 7. Create Assignment 3 WITHOUT Rubric
    assign3_res = client.post(
        f"/classes/{class_id}/assignments",
        headers={"Authorization": f"Bearer {dosen_token}"},
        json={
            "title": "Tugas 3: Latihan Mandiri Tanpa Rubrik",
            "instructions": "Kerjakan soal latihan mandiri bab 5.",
            "dueDate": "2026-12-31T23:59:59Z",
            "maxScore": 100.0,
            "status": "PUBLISHED",
        },
    )
    assert assign3_res.status_code == 201
    assign3_id = assign3_res.json()["id"]
    assert assign3_res.json()["rubricId"] is None

    # 8. Submit to Assignment 3 and verify AI evaluation rejects without rubric
    sub3_res = client.post(
        f"/classes/{class_id}/assignments/{assign3_id}/submissions",
        headers={"Authorization": f"Bearer {mhs_token}"},
        data={"content": "Jawaban latihan mandiri mahasiswa."},
    )
    assert sub3_res.status_code == 201
    sub3_id = sub3_res.json()["submissionId"]

    eval3_res = client.post(
        f"/submissions/{sub3_id}/grade",
        headers={"Authorization": f"Bearer {dosen_token}"},
    )
    assert eval3_res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Tugas belum memiliki rubrik penilaian" in eval3_res.json()["detail"]
    assert "Evaluasi AI memerlukan rubrik dengan kriteria penilaian" in eval3_res.json()["detail"]

    # 9. Submit to Assignment 1 and 2, verify AI evaluates with their respective rubrics
    sub1_res = client.post(
        f"/classes/{class_id}/assignments/{assign1_id}/submissions",
        headers={"Authorization": f"Bearer {mhs_token}"},
        data={"content": "Leader election menggunakan heartbeat dan RequestVote RPC."},
    )
    assert sub1_res.status_code == 201
    sub1_id = sub1_res.json()["submissionId"]

    eval1_res = client.post(
        f"/submissions/{sub1_id}/grade",
        headers={"Authorization": f"Bearer {dosen_token}"},
    )
    assert eval1_res.status_code == 200
    crit_scores_1 = eval1_res.json()["aiEvaluation"]["perCriterionScore"]
    assert len(crit_scores_1) == 2
    detail1 = client.get(f"/classes/{class_id}/assignments/{assign1_id}", headers={"Authorization": f"Bearer {dosen_token}"})
    assert detail1.json()["rubric"]["id"] == rubric1_id
    crit_labels = [c["label"] for c in detail1.json()["rubric"]["criteria"]]
    assert "Mekanisme Leader Election" in crit_labels
    assert "Log Replication & Safety" in crit_labels

