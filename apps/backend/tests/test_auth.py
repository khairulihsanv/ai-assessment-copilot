from fastapi import status


def test_register_dosen(client):
    res = client.post(
        "/auth/register",
        json={
            "name": "Dr. Dosen Pengajar",
            "email": "dosen.test@example.com",
            "password": "Password123!",
            "role": "DOSEN",
        },
    )
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "dosen.test@example.com"
    assert data["user"]["role"] == "DOSEN"


def test_register_mahasiswa(client):
    res = client.post(
        "/auth/register",
        json={
            "name": "Mahasiswa Budi",
            "email": "mhs.unique.auth@example.com",
            "password": "Password123!",
            "role": "MAHASISWA",
        },
    )
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["user"]["role"] == "MAHASISWA"


def test_register_duplicate_email_fails(client):
    res = client.post(
        "/auth/register",
        json={
            "name": "Mahasiswa Duplikat",
            "email": "mhs.test@example.com",
            "password": "Password123!",
            "role": "MAHASISWA",
        },
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email sudah terdaftar" in res.json()["detail"]


def test_login_success(client):
    res = client.post(
        "/auth/login",
        json={
            "email": "dosen.test@example.com",
            "password": "Password123!",
        },
    )
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "DOSEN"


def test_login_wrong_password(client):
    res = client.post(
        "/auth/login",
        json={
            "email": "dosen.test@example.com",
            "password": "WrongPassword!",
        },
    )
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Email atau password salah" in res.json()["detail"]


def test_me_endpoint(client):
    login_res = client.post(
        "/auth/login",
        json={
            "email": "dosen.test@example.com",
            "password": "Password123!",
        },
    )
    token = login_res.json()["access_token"]

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == status.HTTP_200_OK
    assert me_res.json()["email"] == "dosen.test@example.com"
